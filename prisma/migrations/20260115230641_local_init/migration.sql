-- CreateTable
CREATE TABLE "Setting" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "points" INTEGER NOT NULL DEFAULT 0,
    "credits" INTEGER NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "InviteCode" (
    "code" TEXT NOT NULL PRIMARY KEY,
    "used" BOOLEAN NOT NULL DEFAULT false
);

-- CreateTable
CREATE TABLE "Event" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "homeTeam" TEXT NOT NULL,
    "awayTeam" TEXT NOT NULL,
    "kickoffTime" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "finalHomeGoals" INTEGER,
    "finalAwayGoals" INTEGER,
    "creditCost" INTEGER NOT NULL DEFAULT 100
);

-- CreateTable
CREATE TABLE "Bet" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "eventId" INTEGER NOT NULL,
    "predictedHomeGoals" INTEGER NOT NULL,
    "predictedAwayGoals" INTEGER NOT NULL,
    "pointsAwarded" INTEGER NOT NULL DEFAULT 0,
    "creditSpent" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "Bet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Bet_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CreditPool" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "totalDaily" INTEGER NOT NULL DEFAULT 0,
    "totalChampionship" INTEGER NOT NULL DEFAULT 0
);

-- CreateIndex
CREATE UNIQUE INDEX "Setting_key_key" ON "Setting"("key");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Bet_userId_eventId_key" ON "Bet"("userId", "eventId");
