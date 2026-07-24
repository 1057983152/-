#!/usr/bin/env python3
"""Local web console for the Binance public-data paper market maker.

This service deliberately has no credentials and no live-order implementation.
It is intended for strategy observation, parameter checks, and paper operation.
"""
from __future__ import annotations

import asyncio
import hashlib
import hmac
import json
import os
import time
from contextlib import asynccontextmanager
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen

import websockets
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from compliant_spot_maker_strategy import CompliantSpotMaker, MarketSnapshot, Quote, StrategyConfig


@dataclass
class ConsoleState:
    symbol: str
    maker: CompliantSpotMaker
    started_at: float = field(default_factory=time.time)
    enabled: bool = True
    connected: bool = False
    best_bid: float | None = None
    best_ask: float | None = None
    bid_quantity: float | None = None
    ask_quantity: float | None = None
    market_updates: int = 0
    quotes: list[Quote] = field(default_factory=list)
    last_update: float | None = None
    start_marked_value: float | None = None
    last_error: str | None = None
    events: list[str] = field(default_factory=list)
    account_api_status: str = "NOT_CONFIGURED"
    account_last_checked: float | None = None
    account_error: str | None = None

    def record(self, message: str) -> None:
        self.events = [f"{time.strftime('%H:%M:%S')}  {message}", *self.events][:100]


SYMBOL = os.environ.get("MAKER_SYMBOL", "BTCUSDT").upper()
state = ConsoleState(symbol=SYMBOL, maker=CompliantSpotMaker(StrategyConfig(symbol=SYMBOL)))

# Display-only event metadata. This does not submit orders or calculate any
# contest volume. Keep it configurable because individual competition rules
# and end times change between events.
COMPETITION_NAME = os.environ.get("COMPETITION_NAME", "OPN 现货交易竞赛第二期")
COMPETITION_END_AT = os.environ.get("COMPETITION_END_AT", "2026-07-24T18:00:00+08:00")
COMPETITION_TARGET = os.environ.get("COMPETITION_TARGET", "第 201–1000 名")


class BinanceReadOnlyAccount:
    """Minimal signed account check; deliberately has no order endpoints."""

    def __init__(self) -> None:
        self.api_key = os.environ.get("BINANCE_API_KEY", "")
        self.api_secret = os.environ.get("BINANCE_API_SECRET", "")
        self.base_url = os.environ.get("BINANCE_API_BASE_URL", "https://api.binance.com").rstrip("/")

    @property
    def configured(self) -> bool:
        return bool(self.api_key and self.api_secret)

    def verify(self) -> tuple[bool, str | None]:
        if not self.configured:
            return False, "not configured"
        params = {"timestamp": int(time.time() * 1000), "recvWindow": 5000}
        query = urlencode(params)
        signature = hmac.new(self.api_secret.encode(), query.encode(), hashlib.sha256).hexdigest()
        request = Request(
            f"{self.base_url}/api/v3/account?{query}&signature={signature}",
            headers={"X-MBX-APIKEY": self.api_key},
            method="GET",
        )
        # Reading the response verifies permissions/time/IP access. Balances are
        # intentionally discarded and are never returned to the browser.
        with urlopen(request, timeout=10) as response:  # nosec B310: fixed official API base configurable by operator
            json.loads(response.read())
        return True, None


def competition_remaining_seconds() -> int | None:
    try:
        end_at = datetime.fromisoformat(COMPETITION_END_AT)
        if end_at.tzinfo is None:
            return None
        return max(0, round((end_at.astimezone(timezone.utc) - datetime.now(timezone.utc)).total_seconds()))
    except ValueError:
        return None


async def account_connection_monitor() -> None:
    account = BinanceReadOnlyAccount()
    if not account.configured:
        state.account_api_status = "NOT_CONFIGURED"
        return
    while True:
        try:
            connected, error = await asyncio.to_thread(account.verify)
            state.account_api_status = "CONNECTED" if connected else "ERROR"
            state.account_error = error
            state.account_last_checked = time.time()
            if connected:
                state.record("Binance read-only account API connected")
        except asyncio.CancelledError:
            raise
        except Exception as exc:  # Network/API errors are shown without key material.
            state.account_api_status = "ERROR"
            state.account_error = type(exc).__name__
            state.account_last_checked = time.time()
        await asyncio.sleep(30)


async def market_stream() -> None:
    url = f"wss://stream.binance.com:9443/ws/{state.symbol.lower()}@bookTicker"
    delay = 1
    while True:
        try:
            async with websockets.connect(url, ping_interval=20, ping_timeout=20) as ws:
                state.connected, state.last_error, delay = True, None, 1
                state.record("public market-data stream connected")
                async for raw in ws:
                    event = json.loads(raw)
                    market = MarketSnapshot(
                        float(event["b"]), float(event["B"]), float(event["a"]), float(event["A"]), time.time()
                    )
                    state.best_bid, state.best_ask, state.last_update = market.best_bid, market.best_ask, market.timestamp
                    state.bid_quantity, state.ask_quantity = market.bid_quantity, market.ask_quantity
                    state.market_updates += 1
                    state.quotes = state.maker.on_market(market) if state.enabled else []
                    if state.start_marked_value is None:
                        state.start_marked_value = state.maker.state.quote_cash + state.maker.state.base_qty * market.mid
        except asyncio.CancelledError:
            raise
        except (OSError, websockets.WebSocketException, json.JSONDecodeError, KeyError, ValueError) as exc:
            state.connected, state.last_error = False, str(exc)
            state.record(f"stream disconnected: {exc}; retry {delay}s")
            await asyncio.sleep(delay)
            delay = min(delay * 2, 30)


@asynccontextmanager
async def lifespan(_: FastAPI):
    market_task = asyncio.create_task(market_stream())
    account_task = asyncio.create_task(account_connection_monitor())
    yield
    for task in (market_task, account_task):
        task.cancel()
    for task in (market_task, account_task):
        try:
            await task
        except asyncio.CancelledError:
            pass


app = FastAPI(title="Spot Maker Paper Console", lifespan=lifespan)


class ControlRequest(BaseModel):
    enabled: bool


@app.get("/api/status")
async def status() -> dict:
    mid = (state.best_bid + state.best_ask) / 2 if state.best_bid and state.best_ask else None
    session_pnl = None
    if mid is not None and state.start_marked_value is not None:
        session_pnl = state.maker.state.quote_cash + state.maker.state.base_qty * mid - state.start_marked_value
    config = state.maker.config
    bid_notional = state.best_bid * state.bid_quantity if state.best_bid and state.bid_quantity else None
    ask_notional = state.best_ask * state.ask_quantity if state.best_ask and state.ask_quantity else None
    spread_bps = (state.best_ask / state.best_bid - 1) * 10_000 if state.best_bid and state.best_ask else None
    quote_buy_notional = sum(q.price * q.quantity for q in state.quotes if q.side == "BUY")
    quote_sell_notional = sum(q.price * q.quantity for q in state.quotes if q.side == "SELL")
    inventory_ratio = state.maker.state.base_qty / config.max_abs_base_qty if config.max_abs_base_qty else None
    shock_paused = time.time() < state.maker.state.paused_until
    risk_state = "SHOCK_PAUSED" if shock_paused else ("OPERATOR_PAUSED" if not state.enabled else "NORMAL")
    return {
        "mode": "PAPER_ONLY",
        "symbol": state.symbol,
        "strategy_enabled": state.enabled,
        "stream_connected": state.connected,
        "best_bid": state.best_bid,
        "best_ask": state.best_ask,
        "mid": mid,
        "base_inventory": state.maker.state.base_qty,
        "session_pnl_quote": session_pnl,
        "quotes": [q.__dict__ for q in state.quotes],
        "last_update": state.last_update,
        "last_error": state.last_error,
        "events": state.events,
        "started_at": state.started_at,
        "runtime_seconds": max(0, round(time.time() - state.started_at)),
        "market_updates": state.market_updates,
        "bid_quantity": state.bid_quantity,
        "ask_quantity": state.ask_quantity,
        "bid_notional_quote": bid_notional,
        "ask_notional_quote": ask_notional,
        "market_spread_bps": spread_bps,
        "paper_buy_quote_notional": quote_buy_notional,
        "paper_sell_quote_notional": quote_sell_notional,
        "paper_quote_count": len(state.quotes),
        "inventory_limit": config.max_abs_base_qty,
        "inventory_ratio": inventory_ratio,
        "risk_state": risk_state,
        "shock_pause_until": state.maker.state.paused_until if shock_paused else None,
        "competition_name": COMPETITION_NAME,
        "competition_end_at": COMPETITION_END_AT,
        "competition_remaining_seconds": competition_remaining_seconds(),
        "competition_target": COMPETITION_TARGET,
        "account_api_status": state.account_api_status,
        "account_last_checked": state.account_last_checked,
        "account_error": state.account_error,
        "eligible_trade_notional": None,
    }


@app.post("/api/control")
async def set_control(request: ControlRequest) -> dict:
    if not request.enabled:
        state.quotes = []
        state.record("operator paused quoting")
    elif not state.enabled:
        state.record("operator enabled paper quoting")
    state.enabled = request.enabled
    return {"strategy_enabled": state.enabled, "mode": "PAPER_ONLY"}


@app.get("/api/health")
async def health() -> dict:
    if not state.connected:
        raise HTTPException(status_code=503, detail="market data disconnected")
    return {"ok": True}


# Mount static UI last so /api routes retain priority.
app.mount("/", StaticFiles(directory=Path(__file__).parent / "console_static", html=True), name="console")
