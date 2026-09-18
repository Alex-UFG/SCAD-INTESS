import { config } from "dotenv";

// Las pruebas de BD leen DB_* de .env.local (MySQL en podman, nunca TiDB).
config({ path: ".env.local" });
