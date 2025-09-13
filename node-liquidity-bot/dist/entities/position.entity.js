"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Position = void 0;
const typeorm_1 = require("typeorm");
let Position = class Position {
    constructor() {
        this.outOfRangeSince = null;
    }
};
exports.Position = Position;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], Position.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'position_id', unique: true }),
    __metadata("design:type", String)
], Position.prototype, "positionId", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'varchar',
        name: 'hedge_exchange',
        nullable: true
    }),
    __metadata("design:type", String)
], Position.prototype, "hedgeExchange", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'pool_id' }),
    __metadata("design:type", String)
], Position.prototype, "poolId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'initial_base_amount' }),
    __metadata("design:type", String)
], Position.prototype, "initialBaseAmount", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'initial_quote_amount' }),
    __metadata("design:type", String)
], Position.prototype, "initialQuoteAmount", void 0);
__decorate([
    (0, typeorm_1.Column)('decimal', { name: 'initial_price_a', precision: 20, scale: 8 }),
    __metadata("design:type", Number)
], Position.prototype, "initialPriceA", void 0);
__decorate([
    (0, typeorm_1.Column)('decimal', { name: 'initial_price_b', precision: 20, scale: 8 }),
    __metadata("design:type", Number)
], Position.prototype, "initialPriceB", void 0);
__decorate([
    (0, typeorm_1.Column)('decimal', { name: 'initial_value', precision: 20, scale: 8 }),
    __metadata("design:type", Number)
], Position.prototype, "initialValue", void 0);
__decorate([
    (0, typeorm_1.Column)('decimal', { name: 'start_price', precision: 20, scale: 8, nullable: true }),
    __metadata("design:type", Number)
], Position.prototype, "startPrice", void 0);
__decorate([
    (0, typeorm_1.Column)('decimal', { name: 'end_price', precision: 20, scale: 8, nullable: true }),
    __metadata("design:type", Number)
], Position.prototype, "endPrice", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_auto_rebalancing', type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], Position.prototype, "isAutoRebalancing", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'hedge_plan',
        type: 'jsonb',
        nullable: true,
    }),
    __metadata("design:type", Object)
], Position.prototype, "hedgePlan", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'varchar',
        name: 'rebalance_status',
        default: 'idle'
    }),
    __metadata("design:type", String)
], Position.prototype, "rebalanceStatus", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', name: 'rebalance_context', nullable: true }),
    __metadata("design:type", Object)
], Position.prototype, "rebalanceContext", void 0);
__decorate([
    (0, typeorm_1.Column)('decimal', {
        name: 'transaction_costs',
        precision: 20,
        scale: 8,
        default: 0,
    }),
    __metadata("design:type", Number)
], Position.prototype, "transactionCosts", void 0);
__decorate([
    (0, typeorm_1.Column)('decimal', {
        name: 'cumulative_pnl_usd',
        precision: 20,
        scale: 8,
        default: 0,
    }),
    __metadata("design:type", Number)
], Position.prototype, "cumulativePnlUsd", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamptz', nullable: true }),
    __metadata("design:type", Object)
], Position.prototype, "outOfRangeSince", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], Position.prototype, "createdAt", void 0);
exports.Position = Position = __decorate([
    (0, typeorm_1.Entity)('positions')
], Position);
