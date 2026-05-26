import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type AssignmentDocument = Assignment & Document;

export enum AssignmentStatus {
  PENDING_ACCEPTANCE = 'PENDING_ACCEPTANCE',
  ACCEPTED = 'ACCEPTED',
  DECLINED = 'DECLINED',
  CANCELLED = 'CANCELLED',
}

@Schema({ collection: 'assignments', timestamps: true })
export class Assignment {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  jobId!: Types.ObjectId;

  @Prop({ type: String, required: true, index: true })
  country!: string;

  @Prop({ type: Types.ObjectId, required: true, index: true })
  engineerId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true, index: true })
  engineerUserId!: Types.ObjectId; // auth_db.users._id

  @Prop({ type: String, required: true })
  engineerNameSnapshot!: string;

  @Prop({ type: Types.ObjectId, required: true })
  assignedByUserId!: Types.ObjectId; // auth_db.users._id

  @Prop({
    type: String,
    enum: Object.values(AssignmentStatus),
    default: AssignmentStatus.PENDING_ACCEPTANCE,
    index: true,
  })
  assignmentStatus!: AssignmentStatus;

  @Prop({ type: Date, default: null })
  acceptanceDeadlineAt!: Date | null;

  @Prop({ type: Date, default: null })
  acceptedAt!: Date | null;

  @Prop({ type: Date, default: null })
  declinedAt!: Date | null;

  @Prop({ type: String, default: null, maxlength: 500 })
  declineReason!: string | null;

  @Prop({ type: Date, default: null })
  cancelledAt!: Date | null;

  @Prop({ type: Types.ObjectId, default: null })
  cancelledByUserId!: Types.ObjectId | null;

  @Prop({ type: String, default: null, maxlength: 500 })
  cancelReason!: string | null;
}

export const AssignmentSchema = SchemaFactory.createForClass(Assignment);

AssignmentSchema.index(
  { jobId: 1, engineerId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      assignmentStatus: {
        $in: ['PENDING_ACCEPTANCE', 'ACCEPTED'],
      },
    },
  },
);