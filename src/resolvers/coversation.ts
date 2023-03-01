import { GraphQLError } from "graphql";
import { ConversationPopulated, GraphQlContext } from "./../utils/types";
import { Prisma } from "@prisma/client";
import { withFilter } from "graphql-subscriptions";

export interface CreateConversationInput {
  participantIds: Array<string>;
}

const ConversationsResolvers = {
  Query: {
    conversations: async (
      _: any,
      __: any,
      context: GraphQlContext
    ): Promise<Array<ConversationPopulated>> => {
      const { session, prisma } = context;

      if (!session?.user) {
        throw new GraphQLError("You must be logged in to view conversations");
      }

      const { id: user_id } = session.user;

      try {
        const conversations = await prisma.conversation.findMany({
          /* where: {
            participants: {
              some: {
                userId: {
                  equals: user_id,
                },
              },
            },
          }, */
          include: conversationPopulated,
        });
        return conversations.filter(
          (conversation) =>
            !!conversation.participants.find((p) => p.userId === user_id)
        );
      } catch (error) {
        console.error(error);
        throw new GraphQLError("Error getting conversations");
      }
    },
  },
  Mutation: {
    createConversation: async (
      _: any,
      args: { participantIds: Array<string> },
      context: GraphQlContext
    ): Promise<{ conversationId: string }> => {
      console.log("createConversation");
      console.log(args);
      const { participantIds } = args;
      const { session, prisma, pubsub } = context;

      if (!session?.user) {
        throw new GraphQLError(
          "You must be logged in to create a conversation"
        );
      }

      const { id: user_id } = session.user;

      try {
        const conversation = await prisma.conversation.create({
          data: {
            participants: {
              createMany: {
                data: participantIds.map((id) => ({
                  userId: id,
                  hasSeenLatestMessage: id === user_id,
                })),
              },
            },
          },
          include: conversationPopulated,
        });

        /* pubsub subscription */

        pubsub.publish("conversationCreated", {
          conversationCreated: conversation,
        });

        return { conversationId: conversation.id };
      } catch (error) {
        console.error(error);
        throw new GraphQLError("Error creating conversation");
      }
    },
  },

  Subscription: {
    conversationCreated: {
      /* subscribe: (_: any, __: any, context: GraphQlContext) => {
        const { pubsub } = context;
        return pubsub.asyncIterator("conversationCreated");
      }, */

      subscribe: withFilter(
        (_: any, __: any, context: GraphQlContext) => {
          const { pubsub } = context;
          return pubsub.asyncIterator("conversationCreated");
        },
        (
          payload: ConversationCreatedSubscriptionPayload,
          _,
          context: GraphQlContext
        ) => {
          const { session } = context;
          const { conversationCreated } = payload;
          if (!session?.user) {
            return false;
          }
          const { id: user_id } = session.user;
          return !!conversationCreated.participants.find(
            (p) => p.userId === user_id
          );
        }
      ),
    },
  },
};

export default ConversationsResolvers;

export const participantPopulated =
  Prisma.validator<Prisma.ConversationParticipantInclude>()({
    user: {
      select: {
        id: true,
        username: true,
      },
    },
  });

export const conversationPopulated =
  Prisma.validator<Prisma.ConversationInclude>()({
    participants: {
      include: participantPopulated,
    },
    latestMessage: {
      include: {
        sender: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    },
  });

export interface ConversationCreatedSubscriptionPayload {
  conversationCreated: ConversationPopulated;
}
