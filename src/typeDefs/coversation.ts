import gql from "graphql-tag";

const conversationTypeDefs = gql`
  scalar Date

  type Mutation {
    createConversation(participantIds: [String]): createConversationResponse
  }

  type createConversationResponse {
    conversationId: String
  }

  type Conversation {
    id: String
    participants: [Participant]
    latestMessage: Message
    updatedAt: Date
  }

  type Participant {
    id: String
    user: User
    hasSeenLatestMessage: Boolean
  }

  type Query {
    conversations: [Conversation]
  }

  type Subscription {
    conversationCreated: Conversation
  }
`;

export default conversationTypeDefs;
