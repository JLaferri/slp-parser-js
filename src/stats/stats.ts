import _ from "lodash";

import { StockType, ConversionType, ComboType, ActionCountsType, OverallType, PlayerIndexedType, Frames } from "./common";
import { FrameEntryType } from "../SlippiGame";
import { ActionsComputer } from "./actions";
import { ConversionComputer } from "./conversions";
import { ComboComputer } from "./combos";
import { StockComputer } from "./stocks";
import { InputComputer } from "./inputs";
import { generateOverallStats } from "./overall";

export type ComputedStatsType = {
  lastFrame: number;
  playableFrameCount: number;
  stocks: StockType[];
  conversions: ConversionType[];
  combos: ComboType[];
  actionCounts: ActionCountsType[];
  overall: OverallType[];
};

export interface StatComputer<T> {
    processFrame( frame: FrameEntryType): void;
    fetch(): T;
}

export class Stats {
    private lastFrame: number;
    private opponentIndices: PlayerIndexedType[];
    private actionsComputer: ActionsComputer;
    private conversionComputer: ConversionComputer;
    private comboComputer: ComboComputer;
    private stockComputer: StockComputer;
    private inputComputer: InputComputer;
    private allComputers: Array<StatComputer<unknown>>;

    public constructor(opponentIndices: PlayerIndexedType[]) {
        this.opponentIndices = opponentIndices;
        this.actionsComputer = new ActionsComputer(opponentIndices);
        this.conversionComputer = new ConversionComputer(opponentIndices);
        this.comboComputer = new ComboComputer(opponentIndices);
        this.stockComputer = new StockComputer(opponentIndices);
        this.inputComputer = new InputComputer(opponentIndices);

        this.allComputers = [this.actionsComputer, this.conversionComputer, this.comboComputer, this.stockComputer, this.inputComputer];
    }

    public getStats(): ComputedStatsType {
        const inputs = this.inputComputer.fetch();
        const stocks = this.stockComputer.fetch();
        const conversions = this.conversionComputer.fetch();
        const overall = generateOverallStats(this.opponentIndices, inputs, stocks, conversions, this._playableFrameCount());
        return {
            lastFrame: this.lastFrame,
            playableFrameCount: this._playableFrameCount(),
            stocks: stocks,
            conversions: conversions,
            combos: this.comboComputer.fetch(),
            actionCounts: this.actionsComputer.fetch(),
            overall: overall,
        }
    }

    public processFrame(frame: FrameEntryType): void {
        this.lastFrame = frame.frame;

        if (this.opponentIndices.length === 0) {
            return;
        }

        // Don't attempt to compute stats on frames that have not been fully received
        if (!isCompletedFrame(this.opponentIndices, frame)) {
            return;
        }

        this.allComputers.forEach(comp => comp.processFrame(frame));
    }

    private _playableFrameCount(): number {
        return this.lastFrame < Frames.FIRST_PLAYABLE ? 0 : this.lastFrame - Frames.FIRST_PLAYABLE;
    }
}

function isCompletedFrame(opponentIndices: PlayerIndexedType[], frame: FrameEntryType): boolean {
    for (const indices of opponentIndices) {
        const playerPostFrame = _.get(frame, ['players', indices.playerIndex, 'post']);
        const oppPostFrame = _.get(frame, ['players', indices.opponentIndex, 'post']);
        if (!playerPostFrame || !oppPostFrame) {
            return false;
        }
    }
    return true;
}