-- CreateTable
CREATE TABLE "BlockUser" (
    "id" SERIAL NOT NULL,
    "blocker_user_id" INTEGER NOT NULL,
    "blocked_user_id" INTEGER NOT NULL,

    CONSTRAINT "BlockUser_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BlockUser_blocked_user_id_blocker_user_id_key" ON "BlockUser"("blocked_user_id", "blocker_user_id");

-- AddForeignKey
ALTER TABLE "BlockUser" ADD CONSTRAINT "BlockUser_blocker_user_id_fkey" FOREIGN KEY ("blocker_user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlockUser" ADD CONSTRAINT "BlockUser_blocked_user_id_fkey" FOREIGN KEY ("blocked_user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
