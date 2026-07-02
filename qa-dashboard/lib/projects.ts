// Central project registry — add new projects here, QA picks them up automatically
export type Project = {
  id: string
  name: string
  url: string
  category: string
  active: boolean
}

export const PROJECTS: Project[] = [
  { id: 'speakiq',      name: 'SpeakIQ',       url: 'https://speakiq.app',                    category: 'education',    active: true },
  { id: 'kwizzo',       name: 'Kwizzo',         url: 'https://kwizzo.app',                     category: 'education',    active: true },
  { id: 'tutiq',        name: 'TutiQ',          url: 'https://tutiq.app',                      category: 'education',    active: true },
  { id: 'quizbites',    name: 'QuizBites',      url: 'https://quizbites.app',                  category: 'education',    active: true },
  { id: 'roamplan',     name: 'RoamPlan',       url: 'https://roamplan.app',                   category: 'travel',       active: true },
  { id: 'trackwealth',  name: 'TrackWealth',    url: 'https://trackwealth.app',                category: 'finance',      active: true },
  { id: 'invoicemint',  name: 'InvoiceMint',    url: 'https://invoicemint.app',                category: 'finance',      active: true },
  { id: 'resumevault',  name: 'ResumeVault',    url: 'https://resumevault.app',                category: 'productivity', active: true },
  { id: 'draftcal',     name: 'DraftCal',       url: 'https://draftcal.app',                   category: 'productivity', active: true },
  { id: 'aicoachlab',   name: 'AiCoachLab',     url: 'https://aicoachlab.app',                 category: 'productivity', active: true },
  { id: 'flighttracker',name: 'FlightTracker',  url: 'https://flightbrain.app',                category: 'travel',       active: true },
  { id: 'worldtrends',  name: 'WorldTrends',    url: 'https://worldtrends.today',              category: 'news',         active: true },
  { id: 'myvitals',     name: 'MyVitals',       url: 'https://myvitals.app',                   category: 'health',       active: true },
  { id: 'pixelforge',   name: 'PixelForge',     url: 'https://arcadeforge.app',                category: 'gaming',       active: true },
  { id: 'neuralos',     name: 'NeuralOS',       url: 'https://neuralagent.app',                category: 'devtools',     active: true },
  { id: 'bookingcall',  name: 'BookingCall',    url: 'https://bookingcall.app',                category: 'local',        active: true },
  { id: 'mandirates',   name: 'MandiRates',     url: 'https://mandirates.app',                 category: 'food',         active: true },
  { id: 'nammatamil',   name: 'NammaTamil',     url: 'https://nammatamil.live',                category: 'news',         active: true },
  { id: 'anylocal',     name: 'AnyLocal',       url: 'https://anylocal.app',                   category: 'local',        active: true },
  { id: 'weekendai',    name: 'WeekendAI',      url: 'https://weekendai.app',                  category: 'productivity', active: true },
  { id: 'protoforge',   name: 'ProtoForge',     url: 'https://protofast.app',                  category: 'devtools',     active: true },
  { id: 'photorestore', name: 'PhotoRestore',   url: 'https://photorestore.app',               category: 'creative',     active: true },
  { id: 'pdfideas',     name: 'PdfIdeas',       url: 'https://pdfideas.app',                   category: 'productivity', active: true },
  { id: 'quizbytesdaily',name:'QuizBytesDaily', url: 'https://quizbytesdaily.app',             category: 'education',    active: true },
  { id: 'aicoachlab2',  name: 'AiCoachLab2',   url: 'https://aicoachlab.app',                 category: 'productivity', active: false },
  { id: 'hub',          name: 'Hub',            url: 'https://ai-products-hub.vercel.app',     category: 'devtools',     active: true },
  { id: 'agenttrace',   name: 'AgentTrace',     url: 'https://agentlogs.app',                  category: 'devtools',     active: true },
  { id: 'voicejournal', name: 'VoiceJournal',   url: 'https://voicejournal.app',               category: 'productivity', active: true },
  { id: 'meetscribe',   name: 'MeetScribe',     url: 'https://meetscribe.app',                 category: 'productivity', active: true },
  { id: 'playsmart',    name: 'PlaySmart',      url: 'https://playsmart.app',                  category: 'gaming',       active: true },
  { id: 'homecanvas',   name: 'HomeCanvas',     url: 'https://homecanvas.app',                 category: 'local',        active: true },
  { id: 'clawdbotai',   name: 'ClawdBotAI',     url: 'https://clawdbotai.app',                 category: 'devtools',     active: true },
]

export function getActiveProjects() {
  return PROJECTS.filter(p => p.active)
}
