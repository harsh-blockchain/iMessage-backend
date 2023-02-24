import gql from "graphql-tag";

const userTypeDefs = gql`
  type User {
    id: String
    username: String
    image: String
    name: String
    email: String
    emailVerified: Boolean
  }

  type SearchedUser {
    id: String
    username: String
    image: String
  }
  type Query {
    searchUsers(username: String): [SearchedUser]
  }

  type Mutation {
    createUsername(username: String): CreateUsernameResponse
  }

  type CreateUsernameResponse {
    success: Boolean
    error: String
  }
`;

export default userTypeDefs;
