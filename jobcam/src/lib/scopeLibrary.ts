import type { ScopeTemplate } from './types'

/**
 * Built-in service descriptions and scopes of work. Blanks look like {{key|Label|type|default}};
 * see lib/scope.ts. Written as neutral starting points: contractors should confirm local code,
 * licensing and permit requirements for their jurisdiction before relying on a document.
 */

const WARRANTY =
  '{{warranty|Workmanship warranty|select(30 days;90 days;6 months;1 year;2 years)|1 year}} on labor from completion. Manufacturer warranties apply to materials and equipment. Warranty does not cover misuse, neglect, modification by others, or events outside our control.'
const HIDDEN = 'Hidden or pre-existing conditions not visible at inspection; if found, they are quoted separately before work continues.'
const PERMITS = 'Permits, inspection fees and engineering, unless listed in the scope above.'
const ACCESS = 'Work area is accessible and clear on the scheduled date, utilities are on, and the customer is available for a walkthrough at completion.'
const PERMIT_FIELD = '{{permit|Permit & inspection|select(included;billed at cost;by owner;not required)|billed at cost}}'
const LOCATE = '{{locate|Utility locate (811)|select(requested by us;requested by owner)|requested by us}}'

interface Spec {
  id: string
  trade: string
  title: string
  summary: string
  scope: string[]
  included?: string[]
  excluded?: string[]
  assumptions?: string[]
  warranty?: string
  keepHidden?: boolean
}

const t = (s: Spec): ScopeTemplate => {
  // Permit lines are terms, not deliverables: they belong under assumptions, and the generic
  // "permits not included" exclusion would contradict them.
  const isPermit = (l: string) => l.includes('{{permit|')
  const permit = (s.included ?? []).filter(isPermit)
  return {
    id: s.id, trade: s.trade, title: s.title, summary: s.summary, scope: s.scope, included: (s.included ?? []).filter((l) => !isPermit(l)),
    excluded: [...(s.excluded ?? []), ...(s.keepHidden === false ? [] : [HIDDEN]), permit.length ? 'Fees or approvals not stated above.' : PERMITS],
    assumptions: [...permit, ...(s.assumptions ?? []), ACCESS], warranty: s.warranty ?? WARRANTY,
  }
}

const SITE = 'at {{address|Service address}} for {{customer|Customer}}'

export const TRADES = ['Irrigation', 'Drainage', 'Plumbing', 'Painting', 'Roofing', 'Landscaping', 'General', 'HVAC', 'Electrical', 'Cleaning', 'Documents'] as const

export const SCOPE_LIBRARY: ScopeTemplate[] = [
  // ───────────── Irrigation ─────────────
  t({
    id: 'irr-startup', trade: 'Irrigation', title: 'Irrigation startup & system inspection',
    summary: `Turn on, test and inspect the irrigation system ${SITE}, checking every zone and correcting minor issues found.`,
    scope: [
      'Open the supply and pressurize the system slowly; check the backflow assembly, valves and fittings for leaks.',
      'Run all {{zones|Number of zones|number}} zones and inspect each head and nozzle for coverage, clogging, tilt and damage.',
      'Adjust arc, radius and alignment; clean filters and nozzles; set heads to grade.',
      'Confirm each valve and solenoid opens and closes fully.',
      'Inspect the controller, rain sensor and backup battery; set a {{schedule|Schedule type|select(seasonal;weather-based;customer-specified)|seasonal}} watering schedule.',
      'Provide a written list of findings with a quote for any repairs.',
    ],
    included: ['Minor adjustments and nozzle cleaning.', 'Written findings list.'],
    excluded: ['Replacement parts and repairs beyond minor adjustments; quoted separately.', 'Backflow assembly testing, unless listed separately.'],
    assumptions: ['Water supply is on and the controller is accessible.'],
    warranty: 'Adjustments are guaranteed for {{days|Days|number|30}} days. Repairs quoted separately carry their own warranty.',
  }),
  t({
    id: 'irr-heads', trade: 'Irrigation', title: 'Sprinkler head repair & replacement',
    summary: `Replace damaged or failing sprinkler heads ${SITE} and restore even coverage.`,
    scope: [
      'Locate and carefully excavate around {{qty|Number of heads|number}} damaged head(s) in zone(s) {{zones|Zones affected|text}}.',
      'Flush the line, then install new {{headtype|Head type|select(pop-up spray;rotor;MP rotator;drip emitter)|pop-up spray}} head(s) on new swing joints or risers as needed.',
      'Fit matched nozzles and adjust arc, radius and height to grade.',
      'Run each affected zone to confirm coverage and no leaks.',
      'Backfill, compact and restore the disturbed turf area.',
    ],
    included: ['Heads, nozzles, swing joints and fittings.', 'Cleanup of work area.'],
    excluded: ['Repair of damaged lateral or main lines; quoted separately.', 'Re-sodding beyond patching the disturbed area.'],
  }),
  t({
    id: 'irr-valve', trade: 'Irrigation', title: 'Zone valve replacement',
    summary: `Replace failed irrigation zone valve(s) ${SITE} so the zone opens and closes reliably.`,
    scope: [
      'Shut off the water supply and relieve pressure.',
      'Expose {{qty|Number of valves|number|1}} {{valvetype|Valve type|select(electric zone valve;anti-siphon valve;manual valve)|electric zone valve}} at {{location|Valve location|text|valve box}}.',
      'Replace with a {{size|Valve size|select(3/4 in;1 in;1-1/4 in;1-1/2 in)|1 in}} valve using {{connection|Connection|select(slip/glue;threaded;compression)|slip/glue}} fittings, adding unions for future service.',
      'Reconnect the solenoid with waterproof wire connectors.',
      'Flush, then test opening, closing and zone coverage.',
      'Reseat the valve box and lid.',
    ],
    excluded: ['Replacement of damaged control wire beyond the valve connections; quoted separately.'],
  }),
  t({
    id: 'irr-controller', trade: 'Irrigation', title: 'Smart irrigation controller installation',
    summary: `Install and program a new irrigation controller ${SITE}.`,
    scope: [
      'Remove the existing controller; label and photograph all wires.',
      'Mount the {{brand|Controller brand & model|text}} controller at {{location|Mounting location|text|garage}}.',
      'Connect {{zones|Number of zones|number}} zone wires, common, master valve (if present) and rain sensor.',
      'Power the controller from an existing outlet or transformer.',
      'Connect to Wi-Fi and the mobile app; enter yard details and program a schedule.',
      'Test every zone and walk the customer through use.',
    ],
    excluded: ['New electrical circuits or hardwiring; by a licensed electrician if required.', 'Replacement of damaged valves or wiring found during installation.'],
    assumptions: ['A working Wi-Fi signal is available at the controller location.'],
  }),
  t({
    id: 'irr-line', trade: 'Irrigation', title: 'Irrigation line leak repair',
    summary: `Locate and repair a leak in the irrigation main or lateral line ${SITE}.`,
    scope: [
      'Locate the leak by pressure observation and visual inspection near {{location|Approximate location|text}}.',
      'Excavate to expose the {{pipe|Pipe size|select(3/4 in;1 in;1-1/4 in;1-1/2 in;2 in)|1 in}} {{material|Pipe material|select(PVC;poly)|PVC}} line.',
      'Cut out the damaged section (about {{length|Length replaced (ft)|number}} ft) and install new pipe and fittings; use primer and solvent cement for PVC and allow the manufacturer’s cure time before pressurizing.',
      'Pressurize and test for leaks, then backfill and compact in layers.',
      'Restore turf over the trench.',
    ],
    excluded: ['Additional breaks elsewhere in the line; quoted as found.', 'Tree-root removal beyond the repair section.'],
    assumptions: [`Utility locate: ${LOCATE} before any digging.`],
  }),
  t({
    id: 'irr-backflow', trade: 'Irrigation', title: 'Backflow assembly test & repair',
    summary: `Test the backflow prevention assembly ${SITE} and repair it if it fails.`,
    scope: [
      'Test the {{type|Assembly type|select(Pressure vacuum breaker (PVB);Double check (DCVA);Reduced pressure zone (RPZ))|Pressure vacuum breaker (PVB)}} assembly, {{size|Size|text}}, using calibrated test equipment.',
      'Record results on the test report and submit it to {{authority|Water authority|text}} where required.',
      'If the assembly fails, replace worn internal parts with a manufacturer repair kit, then retest.',
      'Tag the assembly and leave a copy of the report with the customer.',
    ],
    excluded: ['Replacement of the complete assembly; quoted separately.', 'Relocation or re-piping of the assembly.'],
    assumptions: ['Testing is performed by a tester certified for the jurisdiction (certification no. {{cert|Tester certification no.|text}}).'],
    warranty: 'Test results reflect the condition of the assembly on the date of the test. Repairs are warranted {{months|Months|number|90}} days on parts and labor.',
  }),
  t({
    id: 'irr-winterize', trade: 'Irrigation', title: 'Irrigation winterization',
    summary: `Prepare the irrigation system ${SITE} for freezing weather to prevent pipe and backflow damage.`,
    scope: [
      'Shut off the water supply to the irrigation system and drain the backflow assembly.',
      'Clear water from {{zones|Number of zones|number}} zones using compressed air at no more than the pipe manufacturer’s rated pressure ({{psi|Air pressure used (psi)|number|50}} psi), cycling each zone until only mist appears.',
      'Open drain valves where installed and leave the manual valve handles in the position recommended by the manufacturer.',
      'Insulate exposed backflow assembly and above-grade piping with {{cover|Cover|select(insulated cover;foam wrap;none)|insulated cover}}.',
      'Turn off the controller or set it to rain mode and note the date on the controller.',
    ],
    excluded: ['Repairs of freeze damage already present.', 'Spring startup; offered separately.'],
    assumptions: ['The compressor is run on-site by the technician.'],
    warranty: 'No warranty applies to freeze damage that results from conditions outside the technician’s control, such as a failed drain valve that was not visible at service.',
  }),
  t({
    id: 'irr-install', trade: 'Irrigation', title: 'New irrigation system installation',
    summary: `Design and install a new automatic irrigation system ${SITE}.`,
    scope: [
      'Walk the site and design {{zones|Number of zones|number}} zones covering about {{area|Irrigated area (sq ft)|number}} sq ft with head-to-head coverage.',
      'Mark the layout and request the utility locate before digging.',
      'Trench and install the mainline and laterals in {{material|Pipe material|select(PVC;poly)|PVC}}.',
      'Install {{valves|Number of valves|number}} zone valves in valve boxes, with a master valve if specified.',
      'Install a code-compliant backflow prevention assembly.',
      'Install heads and nozzles matched by zone: {{heads|Head mix|text|pop-up sprays and rotors}}.',
      'Install and program a controller with rain or freeze sensor.',
      'Flush, pressurize, test and adjust every zone; provide a zone map and walkthrough.',
    ],
    included: [`Permits and inspections: ${PERMIT_FIELD}.`, 'Zone map and controller walkthrough.'],
    excluded: ['Sod or landscape restoration beyond trench lines, unless listed.', 'Water meter or tap upsizing, and electrical power to the controller.'],
    assumptions: ['Available supply is at least {{gpm|Flow (GPM)|number}} GPM at {{psi|Static pressure (psi)|number}} psi, confirmed on site.', `Utility locate: ${LOCATE}.`],
  }),

  // ───────────── Drainage ─────────────
  t({
    id: 'drain-french', trade: 'Drainage', title: 'French drain installation',
    summary: `Install a subsurface drain ${SITE} to move groundwater and surface water away from {{area|Problem area|text}}.`,
    scope: [
      `Mark the route and arrange utility locates (${LOCATE}).`,
      'Excavate a trench about {{width|Trench width (in)|number|12}} in wide and {{depth|Depth (in)|number|18}} in deep for {{length|Length (ft)|number}} ft, sloped at least 1% toward {{outlet|Discharge point|text}}.',
      'Line the trench with filter fabric and place {{gravel|Gravel|text|3/4 in washed gravel}} as a base.',
      'Lay 4 in perforated pipe with holes down; install {{cleanouts|Number of cleanouts|number|2}} cleanout(s).',
      'Cover with gravel to within {{top|Inches below grade|number|4}} in of the surface, wrap the fabric over the top, and finish with {{cap|Surface|select(sod;topsoil and seed;mulch;gravel)|sod}}.',
      'Test flow at the outlet; {{spoils|Excess soil|select(spread on site;hauled away)|spread on site}}.',
    ],
    excluded: ['Foundation waterproofing or structural repair.', 'Repair of utilities that were not marked or not located.'],
    assumptions: ['The drain is designed for shallow groundwater and surface runoff; performance in extreme rainfall cannot be guaranteed.'],
  }),
  t({
    id: 'drain-catch', trade: 'Drainage', title: 'Catch basin & downspout drainage',
    summary: `Collect and carry roof and surface runoff away from the structure ${SITE}.`,
    scope: [
      'Install {{basins|Number of catch basins|number}} {{basinsize|Basin size|select(9 in;12 in;18 in;24 in)|12 in}} catch basin(s) at the low points identified on site.',
      'Connect {{downspouts|Number of downspouts|number}} downspout(s) with solid 4 in pipe sloped at least 1/8 in per foot.',
      'Run solid pipe to {{outlet|Discharge point|text}} and finish with a {{terminal|Outlet|select(pop-up emitter;daylight outlet;connect to existing drain)|pop-up emitter}}.',
      'Backfill, compact and restore the surface; test with water.',
    ],
    excluded: ['Grading of the entire yard beyond the trench lines.', 'Connection to the municipal storm system unless permitted and listed.'],
    assumptions: [`Utility locate: ${LOCATE}.`],
  }),

  // ───────────── Plumbing ─────────────
  t({
    id: 'plb-fixture', trade: 'Plumbing', title: 'Plumbing fixture replacement',
    summary: `Remove and replace plumbing fixtures ${SITE}.`,
    scope: [
      'Shut off the water supply at the fixture or main.',
      'Remove {{qty|Number of fixtures|number|1}} existing {{fixture|Fixture|select(kitchen faucet;bath faucet;toilet;sink;garbage disposal;shower trim;hose bibb)|kitchen faucet}} at {{location|Location|text}}.',
      'Install the new {{model|Fixture / model|text}} supplied by {{supplier|Supplied by|select(contractor;customer)|contractor}}, with new supply lines and stops as needed.',
      'Turn the water on, check all connections for leaks and test operation.',
      'Haul away the old fixture and clean the area.',
    ],
    excluded: ['Repair of corroded shutoff valves or piping inside walls.', 'Cabinet, countertop or tile modification.'],
  }),
  t({
    id: 'plb-heater', trade: 'Plumbing', title: 'Water heater replacement (tank type)',
    summary: `Replace the water heater ${SITE} with a new {{capacity|Capacity (gal)|select(30;40;50;75)|50}}-gallon {{fuel|Fuel|select(gas;electric)|gas}} unit.`,
    scope: [
      'Shut off water and {{fuelshut|Fuel/power|select(gas;electric power)|gas}} supply; drain and disconnect the old unit.',
      'Set the new {{model|Make / model|text}} at {{location|Location|text|existing location}}.',
      'Install new water connectors, shutoff valve, and a temperature-and-pressure relief valve with a discharge pipe to code.',
      'Install an expansion tank where required by code or system pressure.',
      'Connect the gas line with a sediment trap and new connector, or the electrical supply, and verify venting to code; leak-test gas connections.',
      'Fill, purge air, and test operation; set the temperature to {{temp|Set temperature (°F)|number|120}}°F.',
      'Remove and dispose of the old unit.',
    ],
    included: [`Permits and inspections: ${PERMIT_FIELD}.`],
    excluded: ['Correction of existing code violations in venting, gas piping or electrical, unless listed; quoted separately.', 'Drywall, paint or flooring repair.'],
    warranty: 'Tank manufacturer warranty of {{tank|Tank warranty (years)|number|6}} years applies to the unit. Installation labor is warranted {{labor|Labor warranty|select(90 days;1 year;2 years)|1 year}}.',
  }),
  t({
    id: 'plb-drain', trade: 'Plumbing', title: 'Drain clearing & camera inspection',
    summary: `Clear a blocked drain ${SITE} and confirm the line is flowing freely.`,
    scope: [
      'Access the line through {{access|Access point|select(cleanout;fixture;roof vent)|cleanout}} for the {{line|Drain line|select(kitchen sink;bathroom sink;tub or shower;toilet;floor drain;main sewer line)|main sewer line}}.',
      'Clear the blockage with {{method|Method|select(cable machine;hydro-jet)|cable machine}}.',
      'Camera inspection: {{camera|Camera inspection|select(included;not included;optional add-on)|optional add-on}} to confirm the line is clear and identify defects.',
      'Flow-test the line and report findings.',
    ],
    excluded: ['Repair or replacement of cracked, offset or collapsed pipe.', 'A guarantee against recurrence where roots or structural defects are present.'],
    warranty: 'The line is guaranteed to be clear on the day of service. Service is warranted {{days|Days|number|30}} days against recurrence from the same blockage.',
  }),

  // ───────────── Painting ─────────────
  t({
    id: 'pnt-interior', trade: 'Painting', title: 'Interior painting',
    summary: `Prepare and paint interior surfaces ${SITE}.`,
    scope: [
      'Protect floors, furniture and fixtures; move light furniture as agreed.',
      'Patch small holes and cracks, sand, and spot-prime repairs; caulk trim gaps.',
      'Paint {{rooms|Number of rooms|number}} room(s) — {{areas|Rooms / areas|text}} — covering {{surfaces|Surfaces|select(walls only;walls and ceilings;walls, ceilings and trim)|walls and ceilings}}.',
      'Apply {{coats|Coats|select(1;2)|2}} coat(s) of {{product|Paint brand / line|text}} in {{finish|Finish|select(flat;matte;eggshell;satin;semi-gloss)|eggshell}}. Colors: {{colors|Color(s)|text}}.',
      'Remove protection, clean up and touch up.',
    ],
    excluded: ['Moving heavy furniture.', 'Wallpaper removal and repair of water-damaged drywall.'],
    assumptions: ['Customer selects and approves colors before work begins.'],
    warranty: '{{warranty|Workmanship warranty|select(1 year;2 years;3 years)|2 years}} against peeling and blistering from application defects. Excludes damage, moisture and normal wear.',
  }),
  t({
    id: 'pnt-exterior', trade: 'Painting', title: 'Exterior painting',
    summary: `Prepare and repaint the exterior ${SITE}.`,
    scope: [
      'Wash surfaces and allow to dry fully before coating.',
      'Scrape and sand loose paint; spot-prime bare areas; caulk gaps and joints with paintable exterior caulk.',
      'Mask and protect landscaping, windows, fixtures and hardware.',
      'Paint {{structure|Surfaces|select(single-story home;two-story home;trim and doors only;fence;deck)|single-story home}} with {{coats|Coats|select(1;2)|2}} coat(s) of {{product|Paint brand / line|text}}. Color(s): {{colors|Color(s)|text}}.',
      'Remove masking, clean up and touch up.',
    ],
    excluded: ['Replacement of rotted wood; quoted per board or linear foot.', 'Gutters, roofing and masonry repair.'],
    assumptions: ['For homes built before 1978, lead-safe work practices under the EPA RRP rule apply, and the required pamphlet is provided before work begins.', 'Work proceeds in dry weather within the temperature range on the paint label.'],
  }),

  // ───────────── Roofing ─────────────
  t({
    id: 'roof-repair', trade: 'Roofing', title: 'Roof repair',
    summary: `Repair the damaged section of roof ${SITE}.`,
    scope: [
      'Inspect and photograph the damaged area ({{area|Area / slope|text}}).',
      'Remove damaged shingles, flashing or vents over about {{sqft|Area (sq ft)|number}} sq ft.',
      'Inspect the decking and replace damaged sheets at {{deckprice|Price per sheet|money}} per sheet.',
      'Install underlayment, new {{shingle|Shingle type / color|text}} shingles, flashing and sealant to manufacturer instructions.',
      'Seal all penetrations; sweep the area with a magnet for nails.',
    ],
    excluded: ['Full roof replacement.', 'Interior water damage repair.', 'Exact color match of weathered shingles cannot be guaranteed.'],
    warranty: '{{warranty|Workmanship warranty|select(1 year;2 years;5 years)|2 years}} on the repaired area. Manufacturer warranty applies to materials.',
  }),
  t({
    id: 'roof-replace', trade: 'Roofing', title: 'Roof replacement (asphalt shingle)',
    summary: `Remove and replace the roof covering ${SITE}.`,
    scope: [
      'Protect landscaping, siding and A/C equipment; remove {{layers|Existing layers|select(1;2)|1}} layer(s) of roofing.',
      'Inspect decking; replace damaged sheets at {{deckprice|Price per sheet|money}} per sheet.',
      'Install drip edge, underlayment, and additional waterproofing at valleys and penetrations.',
      'Install about {{squares|Roof area (squares)|number}} squares of {{shingle|Shingle line / color|text}} shingles to the manufacturer’s instructions.',
      'Install new pipe boots, {{vents|Ventilation|select(ridge vent;box vents;existing vents reused)|ridge vent}}, flashing and ridge cap.',
      'Clean the site, sweep with a magnet, and haul away debris.',
    ],
    included: [`Permits: ${PERMIT_FIELD}.`],
    excluded: ['Structural or framing repair beyond decking.', 'Gutters, skylights and interior damage.'],
    assumptions: ['One square equals 100 sq ft of roof surface.'],
    warranty: 'Workmanship {{labor|Workmanship warranty|select(2 years;5 years;10 years)|5 years}}; manufacturer shingle warranty per product ({{mfr|Manufacturer warranty|text}}).',
  }),

  // ───────────── Landscaping ─────────────
  t({
    id: 'ls-sod', trade: 'Landscaping', title: 'Sod installation',
    summary: `Prepare the area and install new sod ${SITE}.`,
    scope: [
      'Remove existing turf and weeds from about {{sqft|Area (sq ft)|number}} sq ft.',
      'Rough-grade for drainage away from structures and loosen the top {{till|Tilling depth (in)|number|4}} in of soil.',
      'Incorporate {{amend|Soil amendment|text|compost}} and finish-grade smooth.',
      'Lay {{grass|Grass type|select(Bermuda;St. Augustine;Zoysia;Buffalo;Fescue)|Bermuda}} sod with tight, staggered seams; roll and water in.',
      'Provide written watering and mowing instructions for establishment.',
    ],
    excluded: ['Irrigation changes or repairs.', 'Removal of stumps, large rocks or buried debris.'],
    assumptions: ['Customer waters as instructed during establishment.'],
    warranty: 'Sod that fails to root within {{days|Days|number|30}} days is replaced once, provided the watering instructions were followed.',
  }),
  t({
    id: 'ls-maint', trade: 'Landscaping', title: 'Recurring lawn & landscape maintenance',
    summary: `Regular lawn and landscape care ${SITE}.`,
    scope: [
      'Service {{freq|Frequency|select(weekly;every other week;monthly)|weekly}} during {{season|Season|text|March–November}}.',
      'Mow, edge and trim; blow clippings from hard surfaces.',
      'Weed beds {{weeding|Bed weeding|select(each visit;monthly)|monthly}}.',
      'Seasonal extras: {{extras|Seasonal extras|text}}.',
      'Price per visit: {{price|Price per visit|money}}, billed {{billing|Billing|select(per visit;monthly)|monthly}}.',
    ],
    excluded: ['Fertilizer and pest-control applications unless listed (licensed applicator required).', 'Irrigation repairs, storm cleanup and tree work.'],
    assumptions: ['Either party may cancel with {{notice|Days notice|number|14}} days’ notice.', 'Gates are unlocked and pets secured on service days.'],
    keepHidden: false,
    warranty: 'If you are not satisfied with a visit, tell us within {{days|Days|number|2}} days and we will return to correct it at no charge.',
  }),
  t({
    id: 'ls-mulch', trade: 'Landscaping', title: 'Bed cleanup & mulch',
    summary: `Clean up and mulch planting beds ${SITE}.`,
    scope: [
      'Remove weeds, debris and dead plant material from beds.',
      'Edge beds to a clean line and prune shrubs lightly as agreed.',
      'Apply {{depth|Mulch depth (in)|number|3}} in of {{mulch|Mulch type|text|shredded hardwood}} over about {{sqft|Bed area (sq ft)|number}} sq ft (about {{yards|Cubic yards|number}} cu yd).',
      'Keep mulch clear of trunks and foundations; clean up.',
    ],
    assumptions: ['One cubic yard covers about 108 sq ft at 3 in deep.'],
    keepHidden: false,
  }),
  t({
    id: 'ls-trees', trade: 'Landscaping', title: 'Tree pruning',
    summary: `Prune trees ${SITE} for health, clearance and safety.`,
    scope: [
      'Prune {{qty|Number of trees|number}} tree(s): {{species|Species / location|text}}, to remove dead, diseased or crossing branches and provide {{clear|Clearance|select(roof clearance;walkway clearance;structure clearance;canopy thinning)|roof clearance}}.',
      'Prune in line with ANSI A300 pruning standards; no topping.',
      'Chip or haul away all cuttings: {{debris|Debris|select(hauled away;chipped and left on site)|hauled away}}.',
    ],
    excluded: ['Stump grinding and tree removal.', 'Any work within the utility’s clearance distance of power lines; the utility or a qualified line-clearance contractor must do this.'],
  }),

  // ───────────── General ─────────────
  t({
    id: 'gen-drywall', trade: 'General', title: 'Drywall repair & texture',
    summary: `Repair damaged drywall ${SITE}.`,
    scope: [
      'Protect floors and furnishings; cut out damaged drywall at {{location|Location|text}}.',
      'Install backing and hang {{thick|Thickness|select(1/2 in;5/8 in)|1/2 in}} drywall.',
      'Tape and finish with joint compound in {{coats|Coats|select(2;3)|3}} coats; sand smooth.',
      'Texture to match: {{texture|Texture|select(smooth;orange peel;knockdown;skip trowel)|orange peel}}.',
      'Prime; paint: {{paint|Paint|select(prime only;paint included;paint by others)|prime only}}.',
    ],
    excluded: ['Repair of the source of moisture damage.', 'Painting of entire walls for color match, unless listed.'],
  }),
  t({
    id: 'gen-fence', trade: 'General', title: 'Wood fence installation',
    summary: `Install a new wood fence ${SITE}.`,
    scope: [
      `Mark the fence line and arrange utility locates (${LOCATE}).`,
      'Set {{post|Posts|select(4x4 wood;4x6 wood;steel)|4x4 wood}} posts no more than {{spacing|Post spacing (ft)|number|8}} ft apart, {{depth|Depth (in)|number|24}} in deep in concrete.',
      'Install about {{length|Length (linear ft)|number}} ft of {{height|Height (ft)|select(4;5;6;8)|6}}-ft {{style|Style|select(privacy;picket;board-on-board)|privacy}} fence in {{wood|Wood|select(cedar;pressure-treated pine)|cedar}} with rails and fasteners rated for exterior use.',
      'Install {{gates|Number of gates|number|1}} gate(s) with hardware.',
      'Remove existing fence: {{old|Old fence removal|select(not included;included)|not included}}. Haul away debris.',
    ],
    excluded: ['Property survey, HOA approvals and permits; the customer is responsible.', 'Staining or sealing, unless listed.'],
    assumptions: ['The customer confirms property lines before work begins.'],
  }),
  t({
    id: 'gen-concrete', trade: 'General', title: 'Concrete flatwork',
    summary: `Pour new concrete ${SITE}.`,
    scope: [
      'Excavate and prepare a compacted base of {{base|Base|text|4 in compacted gravel}}.',
      'Build forms and place reinforcement: {{rebar|Reinforcement|select(rebar;wire mesh;fiber-reinforced)|rebar}}.',
      'Pour about {{sqft|Area (sq ft)|number}} sq ft at {{thick|Thickness (in)|number|4}} in thick using a {{psi|Concrete strength (psi)|number|3500}} psi mix.',
      'Finish: {{finish|Finish|select(broom;smooth trowel;stamped;exposed aggregate)|broom}}; cut control joints; apply curing compound.',
      'Remove forms and haul away debris.',
    ],
    excluded: ['Removal of existing concrete, unless listed.', 'Sealing, staining or decorative work, unless listed.'],
    assumptions: ['Customer keeps foot and vehicle traffic off the concrete for the cure time we provide.', 'Control joints reduce but cannot eliminate cracking.'],
  }),
  t({
    id: 'gen-pressure', trade: 'General', title: 'Pressure washing',
    summary: `Clean exterior surfaces ${SITE} with pressure and soft washing.`,
    scope: [
      'Pre-wet and protect plants, electrical outlets and fixtures.',
      'Clean {{surfaces|Surfaces|text}} using {{method|Method|select(pressure wash;soft wash;pressure and soft wash)|pressure and soft wash}} and cleaning solution suited to each surface.',
      'Rinse thoroughly and rinse nearby plants.',
      'Total area approx. {{sqft|Area (sq ft)|number}} sq ft.',
    ],
    excluded: ['Removal of rust or paint stains, unless listed.', 'Sealing, unless listed.'],
    assumptions: ['Customer provides an outdoor water spigot and electricity if needed.'],
    keepHidden: false,
  }),

  // ───────────── HVAC ─────────────
  t({
    id: 'hvac-tune', trade: 'HVAC', title: 'Air conditioner tune-up',
    summary: `Inspect, clean and test the cooling system ${SITE}.`,
    scope: [
      'Check thermostat operation and calibration.',
      'Inspect and clean the outdoor coil; check the fan motor and electrical connections, capacitor and contactor.',
      'Measure refrigerant pressures and temperature drop across the indoor coil.',
      'Replace or inspect the air filter ({{filter|Filter size|text}}) and flush the condensate drain line.',
      'Report findings and recommendations.',
    ],
    excluded: ['Refrigerant is added only with customer approval, priced at {{lb|Price per lb|money}} per pound.', 'Repairs and parts; quoted separately.'],
    assumptions: ['Technician holds EPA Section 608 certification.'],
    warranty: 'Service is warranted {{days|Days|number|30}} days. Parts and repairs carry their own warranty.',
  }),
  t({
    id: 'hvac-replace', trade: 'HVAC', title: 'HVAC system replacement',
    summary: `Replace the heating and cooling system ${SITE}.`,
    scope: [
      'Perform a load calculation (ACCA Manual J) to size the equipment.',
      'Remove and dispose of the old equipment and recover refrigerant as required.',
      'Install a {{tons|Capacity (tons)|select(1.5;2;2.5;3;3.5;4;5)|3}}-ton {{type|System type|select(split AC;heat pump;gas furnace and AC)|split AC}}: {{model|Make / model|text}}.',
      'Set the outdoor unit on a level pad; install the indoor coil or air handler or furnace.',
      'Line set: {{lineset|Line set|select(new;reuse and flush)|new}}. Connect condensate drain, electrical disconnect and thermostat.',
      'Evacuate, charge and start up to manufacturer specifications; verify airflow and temperature split.',
      'Register the manufacturer warranty.',
    ],
    included: [`Permits and inspections: ${PERMIT_FIELD}.`],
    excluded: ['Ductwork modification or replacement, unless listed.', 'Electrical service upgrades.'],
    warranty: 'Equipment manufacturer warranty of {{equip|Equipment warranty (years)|number|10}} years with registration. Installation labor is warranted {{labor|Labor warranty|select(1 year;2 years;5 years)|2 years}}.',
  }),

  // ───────────── Electrical ─────────────
  t({
    id: 'elec-fixtures', trade: 'Electrical', title: 'Light, fan & outlet installation',
    summary: `Install electrical devices ${SITE}.`,
    scope: [
      'Turn off power at the breaker and verify the circuit is dead before work.',
      'Install {{qty|Quantity|number}} {{item|Item|select(light fixture;ceiling fan;outlet;GFCI outlet;switch;dimmer)|light fixture}} at {{location|Location|text}}.',
      'Provide GFCI or AFCI protection where required by code.',
      'Test all devices and clean up.',
    ],
    included: [`Permits: ${PERMIT_FIELD}.`],
    excluded: ['New wiring runs longer than {{ft|Included wire run (ft)|number|10}} ft.', 'Drywall and paint repair.', 'Correction of existing wiring defects.'],
  }),
  t({
    id: 'elec-panel', trade: 'Electrical', title: 'Electrical panel upgrade',
    summary: `Replace the main electrical panel ${SITE}.`,
    scope: [
      'Coordinate the utility disconnect and reconnect.',
      'Replace the existing {{old|Existing panel (amps)|select(60;100;125;150)|100}} A panel with a new {{new|New panel (amps)|select(100;150;200;400)|200}} A panel.',
      'Install the grounding electrode system and bonding to code.',
      'Reconnect and label all circuits; install AFCI/GFCI breakers where required by code.',
      'Pass inspection and restore power.',
    ],
    included: [`Permits and inspections: ${PERMIT_FIELD}.`],
    excluded: ['Utility fees and service-line or mast upgrades performed by the utility.', 'Drywall and paint repair.'],
    assumptions: ['Power will be off for approximately {{hours|Hours without power|number|6}} hours.'],
  }),

  // ───────────── Cleaning ─────────────
  t({
    id: 'cln-turnover', trade: 'Cleaning', title: 'Post-construction / turnover cleaning',
    summary: `Final cleaning ${SITE} after construction or at turnover.`,
    scope: [
      'Remove debris, stickers and protective films; dust all surfaces, vents and fixtures.',
      'Clean cabinets inside and out, counters, appliances, sinks, tubs and toilets.',
      'Clean interior windows, sills and tracks.',
      'Vacuum and mop all floors across about {{sqft|Area (sq ft)|number}} sq ft.',
    ],
    excluded: ['Exterior windows and pressure washing.', 'Paint, stain or adhesive removal; hazardous materials.'],
    keepHidden: false,
    warranty: 'If anything is missed, tell us within {{days|Days|number|2}} days and we will return to correct it at no charge.',
  }),

  // ───────────── Documents ─────────────
  {
    id: 'doc-assessment', trade: 'Documents', title: 'Site assessment & inspection report',
    summary: 'Walk the property {{address|Service address}} with {{customer|Customer}}, document existing conditions, and provide written findings and recommendations.',
    scope: [
      'Photograph and document about {{photos|Approximate number of photos|number|30}} existing conditions with notes.',
      'Identify issues, measure affected areas and note access constraints.',
      'Provide written findings with prioritized recommendations and budget ranges within {{days|Business days|number|3}} business days.',
    ],
    included: ['Photo-documented report.'],
    excluded: ['Structural or engineering opinions.', 'Code-compliance certification and destructive testing.'],
    assumptions: ['Assessment fee of {{fee|Assessment fee|money}} is {{credit|Fee credit|select(credited toward work;not credited)|credited toward work}}.', ACCESS],
    warranty: 'Findings reflect conditions visible and accessible on the date of the visit.',
  },
  {
    id: 'doc-change', trade: 'Documents', title: 'Change order',
    summary: 'Change to the original scope {{address|Service address}} (project: {{project|Project}}), requested by {{by|Requested by|select(customer;contractor;field condition)|customer}} on {{date|Date|date}}.',
    scope: [
      'Description of change: {{change|Description of change|longtext}}',
      'Reason: {{reason|Reason|text}}',
      'Cost change: {{cost|Cost change|money}}',
      'Schedule change: {{sched|Schedule change (days)|number|0}} day(s)',
      'Work on the change begins only after both parties sign this change order.',
    ],
    included: [],
    excluded: ['All other terms of the original agreement are unchanged.'],
    assumptions: ['Pricing for the change is valid for {{valid|Days valid|number|14}} days.'],
    warranty: 'Warranty on changed work matches the original agreement unless stated here: {{note|Note|text|none}}.',
  },
  {
    id: 'doc-closeout', trade: 'Documents', title: 'Completion & walkthrough record',
    summary: 'Work {{address|Service address}} was completed on {{date|Completion date|date}} and reviewed with {{customer|Customer}}.',
    scope: [
      'Work completed per the signed scope of work.',
      'Final walkthrough completed with {{customer}}; items for follow-up: {{followup|Follow-up items|longtext|none}}.',
      'Final photos taken and attached to the project record.',
      'Care and maintenance guidance given: {{care|Care guidance|text}}.',
    ],
    included: [],
    excluded: [],
    assumptions: [],
    warranty: WARRANTY,
  },
]

export const ALL_TRADES = TRADES
