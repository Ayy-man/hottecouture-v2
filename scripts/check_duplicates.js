
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// Load environment variables
const envLocalPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envLocalPath)) {
    const envConfig = dotenv.parse(fs.readFileSync(envLocalPath));
    for (const k in envConfig) {
        process.env[k] = envConfig[k];
    }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDuplicates() {
    const { data, error } = await supabase
        .from('service')
        .select('name');

    if (error) {
        console.error('Error fetching services:', error);
        return;
    }

    const counts = {};
    data.forEach(s => {
        counts[s.name] = (counts[s.name] || 0) + 1;
    });

    const duplicates = Object.entries(counts).filter(([name, count]) => count > 1);

    if (duplicates.length > 0) {
        console.log("Found duplicate services:");
        duplicates.forEach(([name, count]) => {
            console.log(`- "${name}": ${count} times`);
        });
    } else {
        console.log("No duplicate services found.");
    }
}

checkDuplicates();
