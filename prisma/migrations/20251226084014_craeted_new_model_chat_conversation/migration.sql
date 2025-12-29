-- CreateTable
CREATE TABLE "ChatConversation" (
    "id" SERIAL NOT NULL,
    "currentUserId" INTEGER NOT NULL,
    "chatUserId" INTEGER NOT NULL,
    "lastMessage" TEXT NOT NULL,
    "lastMessageCreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatConversation_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ChatConversation" ADD CONSTRAINT "ChatConversation_currentUserId_fkey" FOREIGN KEY ("currentUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatConversation" ADD CONSTRAINT "ChatConversation_chatUserId_fkey" FOREIGN KEY ("chatUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
