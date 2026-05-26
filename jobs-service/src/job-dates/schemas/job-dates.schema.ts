import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type JobDatesDocument = JobDates & Document;

export enum JobDateType {
  RANGE = 'RANGE',
  MULTI = 'MULTI',
}

@Schema({ collection: 'job_dates', timestamps: true })
export class JobDates {
  @Prop({ type: Types.ObjectId, required: true })
  jobId!: Types.ObjectId;

  @Prop({ type: String, required: true, index: true })
  country!: string;

  @Prop({ type: String, enum: Object.values(JobDateType), required: true })
  dateType!: JobDateType;

  @Prop({ type: Date, default: null })
  dateFrom!: Date | null;

  @Prop({ type: Date, default: null })
  dateTo!: Date | null;

  @Prop({ type: [Date], default: [] })
  specificDates!: Date[];
}

export const JobDatesSchema = SchemaFactory.createForClass(JobDates);

JobDatesSchema.index({ jobId: 1 }, { unique: true });