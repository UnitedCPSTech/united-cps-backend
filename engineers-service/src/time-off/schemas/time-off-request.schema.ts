import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type TimeOffRequestDocument = TimeOffRequest & Document;

export enum TimeOffStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}

export enum TimeOffDateType {
  RANGE = 'RANGE',
  MULTI = 'MULTI',
}

@Schema({ collection: 'time_off_requests', timestamps: false })
export class TimeOffRequest {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  engineerId!: Types.ObjectId;

  @Prop({ type: String, required: true, index: true })
  country!: string;

  @Prop({ type: String, enum: Object.values(TimeOffStatus), default: TimeOffStatus.PENDING })
  status?: TimeOffStatus;

  @Prop({ type: String, enum: Object.values(TimeOffDateType), required: true })
  dateType?: TimeOffDateType;

  // RANGE only
  @Prop({ type: Date, default: null })
  dateFrom?: Date | null;

  @Prop({ type: Date, default: null })
  dateTo?: Date | null;

  // MULTI only
  @Prop({ type: [Date], default: [] })
  specificDates?: Date[];

  // Always populated: exact days off at UTC midnight
  @Prop({ type: [Date], default: [], index: true })
  days?: Date[];

  @Prop({ type: String, maxlength: 500 })
  reason?: string;

  @Prop({ type: Date, default: () => new Date() })
  requestedAt?: Date;

  @Prop({ type: Types.ObjectId, default: null })
  reviewedByUserId?: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  reviewedAt?: Date | null;

  @Prop({ type: String, default: null, maxlength: 500 })
  reviewNote?: string | null;

  @Prop({ type: Date, default: () => new Date() })
  updatedAt?: Date;
}

export const TimeOffRequestSchema = SchemaFactory.createForClass(TimeOffRequest);

TimeOffRequestSchema.index({ engineerId: 1, status: 1, requestedAt: -1 });
TimeOffRequestSchema.index({ engineerId: 1, days: 1 });