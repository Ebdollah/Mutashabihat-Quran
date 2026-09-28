// Loads env the same way Next does for local dev (.env.local wins over .env), and applies the same
// network settings as the server (see lib/net.ts). Import this FIRST in scripts.
import { config } from 'dotenv';
import { configureNetwork } from '../lib/net';

config({ path: '.env.local', quiet: true });
config({ quiet: true });
configureNetwork();
