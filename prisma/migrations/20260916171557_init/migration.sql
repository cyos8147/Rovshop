-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'ADMIN',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "GameAccount" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "discountPrice" INTEGER,
    "rank" TEXT NOT NULL,
    "maxRank" TEXT NOT NULL,
    "server" TEXT NOT NULL DEFAULT 'TH',
    "loginType" TEXT NOT NULL DEFAULT 'FACEBOOK',
    "heroCount" INTEGER NOT NULL,
    "skinCount" INTEGER NOT NULL,
    "rareSkins" TEXT NOT NULL,
    "diamondBalance" INTEGER NOT NULL DEFAULT 0,
    "coinBalance" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "credentialUsername" TEXT,
    "credentialPassword" TEXT,
    "credentialNote" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AccountImage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "url" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "accountId" TEXT NOT NULL,
    CONSTRAINT "AccountImage_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "GameAccount" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Testimonial" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Settings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "contactUrl" TEXT NOT NULL DEFAULT 'https://www.facebook.com/',
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "GameAccount_slug_key" ON "GameAccount"("slug");

-- CreateIndex
CREATE INDEX "GameAccount_status_idx" ON "GameAccount"("status");
