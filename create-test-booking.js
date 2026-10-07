const fs = require('fs');
const env = fs.readFileSync('.env', 'utf8');
const envVars = {};
for (const line of env.split(/\r?\n/)) {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) envVars[match[1].trim()] = match[2].trim();
}

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(envVars.EXPO_PUBLIC_SUPABASE_URL, envVars.EXPO_PUBLIC_SUPABASE_ANON_KEY);

async function main() {
  console.log("=== Creating Instant Test Equipment Reservation ===");

  // 1. Fetch first client profile
  const { data: profiles, error: pErr } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, role')
    .limit(5);

  if (pErr || !profiles || profiles.length === 0) {
    console.error("No profiles found:", pErr);
    return;
  }

  const client = profiles.find(p => p.role === 'client') || profiles[0];
  console.log(`Using user: ${client.first_name} ${client.last_name} (${client.id})`);

  // 2. Fetch first equipment
  const { data: equipment, error: eErr } = await supabase
    .from('equipment')
    .select('id, name')
    .limit(1);

  if (eErr || !equipment || equipment.length === 0) {
    console.error("No equipment found:", eErr);
    return;
  }

  const equip = equipment[0];
  console.log(`Using equipment: ${equip.name} (${equip.id})`);

  // 3. Compute time for today: starts right now, ends in 15 minutes
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

  const startH = now.getHours();
  const startM = now.getMinutes();
  const endMinutes = startM + 15;
  const endH = (startH + Math.floor(endMinutes / 60)) % 24;
  const endM = endMinutes % 60;

  const startTime = `${pad(startH)}:${pad(startM)}:00`;
  const endTime = `${pad(endH)}:${pad(endM)}:00`;

  const notes = JSON.stringify({
    checked_in: false,
    checked_in_at: null,
    checked_in_by: null,
    notified_5min_start: false,
    notified_5min_end: false,
    auto_cancelled: false,
    cancel_reason: null,
  });

  const { data: res, error: rErr } = await supabase
    .from('reservations')
    .insert({
      client_id: client.id,
      equipment_id: equip.id,
      reservation_date: dateStr,
      start_time: startTime,
      end_time: endTime,
      status: 'confirmed',
      notes: notes,
    })
    .select()
    .single();

  if (rErr) {
    console.error("Error creating test reservation:", rErr.message);
    return;
  }

  console.log("\n SUCCESS! Test reservation created:");
  console.log(`- ID: ${res.id}`);
  console.log(`- Equipment: ${equip.name}`);
  console.log(`- Date: ${dateStr}`);
  console.log(`- Time: ${startTime.slice(0, 5)} - ${endTime.slice(0, 5)}`);
  console.log(`- Status: confirmed (Awaiting Front Desk Check-in)`);
  console.log("\nWhat to test now:");
  console.log("1. Open http://localhost:8081/client/reservations -> Shows 'Awaiting Check-in'");
  console.log("2. Open http://localhost:8081/admin/reservations-manage -> Click '✓ Check In Client'");
  console.log("3. Return to client screen -> Shows '[ACTIVE NOW]' with live countdown timer!");
}

main();
