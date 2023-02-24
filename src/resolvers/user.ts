import { User } from "@prisma/client";
import { GraphQlContext, createUserrnameRsponse } from "./../utils/types";
import { GraphQLError } from "graphql";

const userResolvers = {
  Query: {
    searchUsers: async (
      _: any,
      args: { username: string },
      context: GraphQlContext
    ): Promise<Array<User>> => {
      const { username: searchedUsername } = args;
      const { session, prisma } = context;

      if (!session?.user) {
        throw new GraphQLError("You must be logged in to search for users");
      }

      const {
        user: { username: myUsername },
      } = session;

      try {
        const users = await prisma.user.findMany({
          where: {
            username: {
              contains: searchedUsername,
              mode: "insensitive",
              not: myUsername,
            },
          },
        });

        return users;
      } catch (error: any) {
        console.log(error);
        throw new GraphQLError(error.message);
      }
    },
  },
  Mutation: {
    createUsername: async (
      _: any,
      args: { username: string },
      context: GraphQlContext
    ): Promise<createUserrnameRsponse> => {
      const { username } = args;
      const { session, prisma } = context;

      if (!session) {
        return {
          error: "You must be logged in to create a username",
        };
      }
      const { id: user_id } = session.user;
      try {
        /* check username not taken */
        const existingUser = await prisma.user.findUnique({
          where: {
            username,
          },
        });

        if (existingUser) {
          return {
            error: "Username already taken, Try another",
          };
        }

        await prisma.user.update({
          where: {
            id: user_id,
          },
          data: {
            username,
          },
        });

        return {
          success: true,
        };
      } catch (error: any) {
        return {
          error: error.message,
        };
      }

      return {
        success: true,
      };
    },
  },
};

export default userResolvers;
