import { Activity, Team, User, Workout } from '../models/index.js';
import mongoose from 'mongoose';

export async function listActivities() {
  const activities = await Activity.find();
  return activities.map(a => ({
    ...a.toObject(),
    user: a.user.toString(),
    team: a.team.toString(),
  }));
}

export async function createActivity(input: unknown) {
  const data = input as Record<string, unknown>;
  
  if (!data.userId || !data.teamId || !data.type || data.minutes === undefined) {
    const error = new Error('Missing required fields: userId, teamId, type, minutes');
    Object.assign(error, { status: 400 });
    throw error;
  }

  let userId: mongoose.Types.ObjectId;
  let teamId: mongoose.Types.ObjectId;
  
  try {
    userId = new mongoose.Types.ObjectId(data.userId as string);
    teamId = new mongoose.Types.ObjectId(data.teamId as string);
  } catch {
    const error = new Error('Invalid user ID or team ID format');
    Object.assign(error, { status: 400 });
    throw error;
  }

  const userExists = await User.exists({ _id: userId });
  if (!userExists) {
    const error = new Error('User not found');
    Object.assign(error, { status: 404 });
    throw error;
  }

  const teamExists = await Team.exists({ _id: teamId });
  if (!teamExists) {
    const error = new Error('Team not found');
    Object.assign(error, { status: 404 });
    throw error;
  }

  const minutes = data.minutes as number;
  const points = minutes;
  const occurredAt = new Date();

  const activity = await Activity.create({
    user: userId,
    team: teamId,
    type: data.type,
    minutes,
    points,
    occurredAt,
  });

  return {
    ...activity.toObject(),
    user: activity.user.toString(),
    team: activity.team.toString(),
  };
}

export async function listTeams() {
  const teams = await Team.find();
  return teams.map(t => ({
    ...t.toObject(),
    members: t.members.map(m => m.toString()),
  }));
}

export async function createTeam(input: unknown) {
  const data = input as Record<string, unknown>;
  
  if (!data.name) {
    const error = new Error('Team name is required');
    Object.assign(error, { status: 400 });
    throw error;
  }

  const team = await Team.create({
    name: data.name,
    mascot: data.mascot || '',
    members: (data.members as string[]) || [],
  });

  return {
    ...team.toObject(),
    members: team.members.map(m => m.toString()),
  };
}

export async function getLeaderboard() {
  const teams = await Team.find();
  
  const leaderboard = await Promise.all(
    teams.map(async (team) => {
      const totalPoints = await Activity.aggregate([
        { $match: { team: team._id } },
        { $group: { _id: null, total: { $sum: '$points' } } },
      ]);

      return {
        teamId: team._id,
        teamName: team.name,
        totalPoints: totalPoints[0]?.total || 0,
      };
    })
  );

  leaderboard.sort((a, b) => b.totalPoints - a.totalPoints);

  return leaderboard.map((entry, index) => ({
    teamName: entry.teamName,
    totalPoints: entry.totalPoints,
    rank: index + 1,
  }));
}

export async function suggestWorkouts(userEmail: string) {
  const user = await User.findOne({ email: userEmail });
  
  if (!user) {
    const error = new Error('User not found');
    Object.assign(error, { status: 404 });
    throw error;
  }

  const recentActivities = await Activity.find({ user: user._id })
    .sort({ occurredAt: -1 })
    .limit(1);

  let matchFocus = user.fitnessGoal;
  if (recentActivities.length > 0) {
    const activityType = recentActivities[0].type;
    if (activityType === 'run' || activityType === 'walk') {
      matchFocus = 'endurance';
    } else if (activityType === 'cycle') {
      matchFocus = 'endurance';
    } else if (activityType === 'strength') {
      matchFocus = 'strength';
    }
  }

  const workouts = await Workout.find({ focus: matchFocus });

  const suggestions = workouts.map((workout) => ({
    ...workout.toObject(),
    reason: `Matches your ${matchFocus} goal and recent activity pattern`,
  }));

  return suggestions;
}

export { User };
