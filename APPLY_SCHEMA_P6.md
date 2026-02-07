# Applying P6 Schema (Prediction Leaderboard)

## 1. Run in Supabase SQL Editor

Copy and paste the contents of `schema-p6-predictions.sql` into the Supabase SQL Editor and execute.

This creates:
- `pp_predictions` table with all necessary columns
- Indexes for efficient leaderboard queries
- Additional columns on `pp_users` for streak tracking

## 2. Verify Tables

After running, verify with:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'pp_%'
ORDER BY table_name;
```

You should see `pp_predictions` in the list.

## 3. Test Commands

- `/predict bitcoin yes` — Make a prediction
- `/predictions` — View prediction history  
- `/accuracy` — Your accuracy stats
- `/leaderboard` — Top predictors (Premium only)

## Features

- **Free users** can make predictions (drives engagement)
- **Premium users** get full leaderboard access
- Monthly reset, minimum 10 resolved predictions to qualify
- Tracks streaks and best/worst categories
