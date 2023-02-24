import { messagePopulated } from "./../resolvers/message";
import { PubSub } from "graphql-subscriptions";
import { Context } from "graphql-ws/lib/server";
import {
  conversationPopulated,
  participantPopulated,
} from "./../resolvers/coversation";
import { Prisma, PrismaClient } from "@prisma/client";

/* server config */

export interface GraphQlContext {
  session: Session | null;
  prisma: PrismaClient;
  pubsub: PubSub;
}

export interface subscriptionContext extends Context {
  connectionParams: {
    session?: Session;
  };
}

/* users */

export interface createUserrnameRsponse {
  success?: boolean;
  error?: string;
}

export interface User {
  id: string;
  username: string;
  email: string;
  image: string;
  name: string;
  emailVerified: boolean;
}

export interface Session {
  user: User;
  expires: string;
}

/* conversations */

export type ConversationPopulated = Prisma.ConversationGetPayload<{
  include: typeof conversationPopulated;
}>;

export type ParticipantPopulated = Prisma.ConversationParticipantGetPayload<{
  include: typeof participantPopulated;
}>;

/* messages */

export interface sendMessageArgs {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
}

export interface MessageSentSubscriptionPayload {
  messageSent: messagePopulatedType;
}

export type messagePopulatedType = Prisma.MessageGetPayload<{
  include: typeof messagePopulated;
}>;
