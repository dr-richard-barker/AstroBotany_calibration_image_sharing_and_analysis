// CLI seed: `npm run seed`. Loads the real, openly-licensed starter images.
import { runSeed } from '../seed-data.ts';

const added = runSeed(m => console.log(m));
console.log(`\nDone. ${added} image(s) added.`);
