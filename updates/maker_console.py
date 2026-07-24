#!/usr/bin/env python3
"""Local web console for the Binance public-data paper market maker.

This service deliberately has no credentials and no live-order implementation.
It is intended for strategy observation, parameter checks, and paper operation.
"""
from __future__ import annotations

import asyncio
import json
import os
import time
from contextlib import asynccontextmanager
from dataclasses import dataclass, field
from pathlib import Path

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

    def record(self, message: str) -> None:
        self.events = [f"{time.strftime('%H:%M:%S')}  {message}", *self.events][:100]


SYMBOL = os.environ.get("MAKER_SYMBOL", "BTCUSDT").upper()
state = ConsoleState(symbol=SYMBOL, maker=CompliantSpotMaker(StrategyConfig(symbol=SYMBOL)))


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
    task = asyncio.create_task(market_stream())
    yield
    task.cancel()
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
