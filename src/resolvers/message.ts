import { Prisma } from "@prisma/client";
import { GraphQLError } from "graphql";
import { withFilter } from "graphql-subscriptions";
import {
  GraphQlContext,
  messagePopulatedType,
  MessageSentSubscriptionPayload,
  sendMessageArgs,
} from "./../utils/types";
import { userIsConversationParticipant } from "./../utils/functions";
import { conversationPopulated } from "./coversation";

const messagesResolvers = {
  Query: {
    messages: async (
      _: any,
      args: { conversationId: string },
      context: GraphQlContext
    ): Promise<Array<messagePopulatedType>> => {
      const { session, prisma } = context;
      const { conversationId } = args;

      if (!session?.user) {
        throw new GraphQLError("You must be logged in to view messages");
      }

      const { id: user_id } = session.user;

      const conversation = await prisma.conversation.findUnique({
        where: {
          id: conversationId,
        },
        include: conversationPopulated,
      });

      if (!conversation) {
        throw new GraphQLError("Conversation not found");
      }

      const allowedToView = userIsConversationParticipant(
        conversation.participants,
        user_id
      );

      if (!allowedToView) {
        throw new GraphQLError("Not Authorized");
      }

      try {
        const messages = await prisma.message.findMany({
          where: {
            conversationId,
          },
          include: messagePopulated,
          orderBy: {
            createdAt: "desc",
          },
        });

        return messages;
      } catch (error) {
        console.error(error);
        throw new GraphQLError("Error getting messages");
      }
    },
  },

  Mutation: {
    sendMessage: async (
      _: any,
      args: sendMessageArgs,
      context: GraphQlContext
    ): Promise<Boolean> => {
      const { session, prisma, pubsub } = context;

      if (!session?.user) {
        throw new GraphQLError("You must be logged in to send a message");
      }

      const { id: userId } = session.user;
      const { id: messageId, senderId, conversationId, body } = args;

      if (userId !== senderId) {
        throw new GraphQLError("Not Authorized");
      }

      try {
        const newMessage = await prisma.message.create({
          data: {
            id: messageId,
            body,
            senderId,
            conversationId,
          },
          include: messagePopulated,
        });

        // pubsub.publish("messageSent", {
        //   messageSent: newMessage,
        //   conversationId,
        // });

        /* find conversation entity */

        const participant = await prisma.conversationParticipant.findFirst({
          where: {
            userId,
            conversationId,
          },
        });

        if (!participant) {
          throw new GraphQLError("Not Authorized");
        }

        const conversation = await prisma.conversation.update({
          where: {
            id: conversationId,
          },
          data: {
            latestMessageId: newMessage.id,
            participants: {
              update: {
                where: {
                  id: participant?.id,
                },
                data: {
                  hasSeenLatestMessage: true,
                },
              },
              updateMany: {
                where: {
                  NOT: {
                    userId: senderId,
                  },
                },
                data: {
                  hasSeenLatestMessage: false,
                },
              },
            },
          },
          include: conversationPopulated,
        });

        pubsub.publish("messageSent", {
          messageSent: newMessage,
        });

        // pubsub.publish("conversationUpdated", {
        //   conversationUpdated: { conversation },
        // });
      } catch (error) {
        console.error(error);
        throw new GraphQLError("Error sending message");
      }

      return true;
    },
  },
  Subscription: {
    messageSent: {
      subscribe: withFilter(
        (_: any, __: any, context: GraphQlContext) => {
          const { pubsub } = context;
          return pubsub.asyncIterator("messageSent");
        },
        (
          payload: MessageSentSubscriptionPayload,
          args: {
            conversationId: string;
          },
          context: GraphQlContext
        ) => {
          return payload.messageSent.conversationId === args.conversationId;
        }
      ),
    },
  },
};

export default messagesResolvers;

export const messagePopulated = Prisma.validator<Prisma.MessageInclude>()({
  sender: {
    select: {
      id: true,
      username: true,
    },
  },
});
