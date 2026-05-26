import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type RefreshTokenDocument = HydratedDocument<RefreshToken>;

@Schema({ collection: 'refresh_tokens', timestamps: false })
export class RefreshToken {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  userId: Types.ObjectId;

  // store only hash of refresh token
  @Prop({ required: true, index: true })
  tokenHash: string;

  @Prop({ type: Date, required: true })
  expiresAt: Date;

  @Prop({ type: Date, default: null })
  revokedAt: Date | null;

  @Prop({ required: true })
  createdAt: Date;

  // optional metadata (helps later)
  @Prop({ type: String, default: null })
  userAgent: string | null;

  @Prop({ type: String, default: null })
  ip: string | null;
}

export const RefreshTokenSchema = SchemaFactory.createForClass(RefreshToken);

RefreshTokenSchema.index(
  { tokenHash: 1 },
  { unique: true, name: 'ux_refresh_tokenHash' },
);

RefreshTokenSchema.index(
  { userId: 1, revokedAt: 1, expiresAt: 1 },
  { name: 'ix_refresh_user_status' },
);

// optional TTL (auto cleanup after expiration)
RefreshTokenSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0, name: 'ttl_refresh_expiresAt' },
);
