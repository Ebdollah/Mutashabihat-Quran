// Loads env the same way Next does for local dev (.env.local wins over .env). Import this FIRST in scripts.
import { config } from 'dotenv';

config({ path: '.env.local', quiet: true });
config({ quiet: true });
