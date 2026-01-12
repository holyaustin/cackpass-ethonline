// types/user.ts
import { User as PrivyUser } from '@privy-io/react-auth'

export interface CustomUser extends PrivyUser {
  organizer?: boolean
  admin?: boolean
  // Add other custom properties as needed
}