import userResolvers from "./user";
import merge from "lodash.merge";
import ConversationsResolvers from "./coversation";
import messagesResolvers from "./message";

const resolvers = merge(
  {},
  userResolvers,
  ConversationsResolvers,
  messagesResolvers
);

export default resolvers;
