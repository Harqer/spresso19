export type TimeBlock = "LATE_NIGHT" | "EARLY_MORNING" | "MORNING" | "AFTERNOON" | "EVENING" | "NIGHT";

export interface GreetingContext {
  userName: string;
  timeBlock: TimeBlock;
  timeBlockLabel: string;
  currentTime: string;
  currentDate: string;
  dayOfWeek: string;
  isWeekend: boolean;
  timeZone: string;
  timeGreetingHeader: string;
  fullWelcomeMessage: string;
}

const LATE_NIGHT_GREETINGS = [
  "Good late night{name}.",
  "Good evening{name}."
];

const EARLY_MORNING_GREETINGS = [
  "Good morning{name}."
];

const MORNING_GREETINGS = [
  "Good morning{name}."
];

const AFTERNOON_GREETINGS = [
  "Good afternoon{name}."
];

const EVENING_GREETINGS = [
  "Good evening{name}."
];

const NIGHT_GREETINGS = [
  "Good evening{name}."
];

const DAY_OF_WEEK_FLAIR: Record<string, string[]> = {
  Friday: ["Happy Friday."],
  Saturday: ["Happy Saturday."],
  Sunday: ["Happy Sunday."],
  Monday: ["Happy Monday."],
  Tuesday: ["Happy Tuesday."],
  Wednesday: ["Happy Wednesday."],
  Thursday: ["Happy Thursday."]
};

const VALUE_PROPS = [
  "How can I help you find outfits, ingredients, or local retail deals today?",
  "What would you like to explore today?"
];

function getRandomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function getTimeBlock(date: Date = new Date()): { timeBlock: TimeBlock; timeBlockLabel: string } {
  const hours = date.getHours();

  if (hours >= 0 && hours < 5) {
    return { timeBlock: "LATE_NIGHT", timeBlockLabel: "Late Night" };
  } else if (hours >= 5 && hours < 9) {
    return { timeBlock: "EARLY_MORNING", timeBlockLabel: "Early Morning" };
  } else if (hours >= 9 && hours < 12) {
    return { timeBlock: "MORNING", timeBlockLabel: "Morning" };
  } else if (hours >= 12 && hours < 17) {
    return { timeBlock: "AFTERNOON", timeBlockLabel: "Afternoon" };
  } else if (hours >= 17 && hours < 21) {
    return { timeBlock: "EVENING", timeBlockLabel: "Evening" };
  } else {
    return { timeBlock: "NIGHT", timeBlockLabel: "Night" };
  }
}

export function generateDynamicGreeting(rawUserName?: string, customDate?: Date): GreetingContext {
  const date = customDate || new Date();
  const { timeBlock, timeBlockLabel } = getTimeBlock(date);

  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const dayOfWeek = days[date.getDay()];
  const isWeekend = dayOfWeek === "Saturday" || dayOfWeek === "Sunday";

  const currentTime = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const currentDate = date.toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  });

  const cleanedLower = (rawUserName || "").trim().toLowerCase();
  const userName = rawUserName && rawUserName.trim() ? rawUserName.trim() : "";

  let greetingTemplate = "";
  switch (timeBlock) {
    case "LATE_NIGHT":
      greetingTemplate = getRandomItem(LATE_NIGHT_GREETINGS);
      break;
    case "EARLY_MORNING":
      greetingTemplate = getRandomItem(EARLY_MORNING_GREETINGS);
      break;
    case "MORNING":
      greetingTemplate = getRandomItem(MORNING_GREETINGS);
      break;
    case "AFTERNOON":
      greetingTemplate = getRandomItem(AFTERNOON_GREETINGS);
      break;
    case "EVENING":
      greetingTemplate = getRandomItem(EVENING_GREETINGS);
      break;
    case "NIGHT":
      greetingTemplate = getRandomItem(NIGHT_GREETINGS);
      break;
  }

  const nameSuffix = userName ? `, ${userName}` : "";
  const timeGreetingHeader = greetingTemplate.replace("{name}", nameSuffix);

  const valueProp = getRandomItem(VALUE_PROPS);
  const fullWelcomeMessage = valueProp;

  const userTimeZone = typeof Intl !== "undefined" && Intl.DateTimeFormat
    ? Intl.DateTimeFormat().resolvedOptions().timeZone || "Local Time"
    : "Local Time";

  return {
    userName,
    timeBlock,
    timeBlockLabel,
    currentTime,
    currentDate,
    dayOfWeek,
    isWeekend,
    timeZone: userTimeZone,
    timeGreetingHeader,
    fullWelcomeMessage
  };
}
