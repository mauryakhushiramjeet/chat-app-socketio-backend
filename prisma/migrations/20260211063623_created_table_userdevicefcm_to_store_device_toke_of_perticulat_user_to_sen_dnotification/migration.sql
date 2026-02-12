-- CreateTable
CREATE TABLE "UserDeviceFcmToken" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "fcm_Token" TEXT NOT NULL,

    CONSTRAINT "UserDeviceFcmToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserDeviceFcmToken_fcm_Token_key" ON "UserDeviceFcmToken"("fcm_Token");

-- AddForeignKey
ALTER TABLE "UserDeviceFcmToken" ADD CONSTRAINT "UserDeviceFcmToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
