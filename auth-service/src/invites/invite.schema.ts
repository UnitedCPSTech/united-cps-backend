import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type InviteDocument = HydratedDocument<Invite>;

@Schema({
  collection: 'invites',
  timestamps: false,
})
export class Invite {
  @Prop({ required: true, lowercase: true, trim: true })
  email!: string;

  @Prop({ required: true, enum: ['OPS_MANAGER', 'ENGINEER'] })
  role!: 'OPS_MANAGER' | 'ENGINEER';

  @Prop({ required: true })
  country!: string;

  @Prop({ required: true })
  tokenHash!: string;

  @Prop({ type: Date, required: true })
  expiresAt!: Date;

  @Prop({ type: Date, default: null })
  usedAt?: Date | null;

  @Prop({ type: Types.ObjectId, required: true })
  createdBy?: Types.ObjectId;

  @Prop({ type: Date, required: true })
  createdAt?: Date;
}

export const InviteSchema = SchemaFactory.createForClass(Invite);

// Indexes for safety + speed
InviteSchema.index(
  { email: 1, usedAt: 1, expiresAt: 1 },
  { name: 'ix_invites_email_status' },
);

// Auto-delete expired invites (safe and recommended)
InviteSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0, name: 'ttl_invites_expiresAt' },
);
