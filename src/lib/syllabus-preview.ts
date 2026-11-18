export type MeetingPreview = {
  label: string;
  weekdays: number[];
  start_time: string | null;
  end_time: string | null;
  start_date: string | null;
  end_date: string | null;
  location: string | null;
  repeat_every_weeks: number | null;
  excluded_dates: string[];
  notes: string | null;
  source_page: number | null;
};

export type DeadlinePreview = {
  title: string;
  kind: string;
  due_date: string | null;
  due_time: string | null;
  source_page: number | null;
};

export type SyllabusPreview = {
  course_code: string | null;
  course_name: string | null;
  meetings: MeetingPreview[];
  deadlines: DeadlinePreview[];
  questions: string[];
};

const nullableText = { type: ["string", "null"] };
const sourcePage = { type: ["integer", "null"], minimum: 1 };
const stringList = { type: "array", items: { type: "string" } };

const deadlineKinds = [
  "assignment",
  "lab",
  "quiz",
  "test",
  "exam",
  "other",
];

function objectSchema(properties: Record<string, unknown>) {
  return {
    type: "object",
    properties,
    required: Object.keys(properties),
    additionalProperties: false,
  };
}

export const syllabusPreviewSchema = objectSchema({
  course_code: nullableText,
  course_name: nullableText,

  meetings: {
    type: "array",
    items: objectSchema({
      label: { type: "string" },
      weekdays: {
        type: "array",
        items: { type: "integer", minimum: 0, maximum: 6 },
      },
      start_time: nullableText,
      end_time: nullableText,
      start_date: nullableText,
      end_date: nullableText,
      location: nullableText,
      repeat_every_weeks: {
        type: ["integer", "null"],
        enum: [1, 2, null],
      },
      excluded_dates: stringList,
      notes: nullableText,
      source_page: sourcePage,
    }),
  },

  deadlines: {
    type: "array",
    items: objectSchema({
      title: { type: "string" },
      kind: { type: "string", enum: deadlineKinds },
      due_date: nullableText,
      due_time: nullableText,
      source_page: sourcePage,
    }),
  },

  questions: stringList,
});

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNullableText(value: unknown) {
  return value === null || typeof value === "string";
}

function isStringList(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isSourcePage(value: unknown) {
  return (
    value === null ||
    (typeof value === "number" && Number.isInteger(value) && value >= 1)
  );
}

export function isSyllabusPreview(value: unknown): value is SyllabusPreview {
  if (
    !isRecord(value) ||
    !isNullableText(value.course_code) ||
    !isNullableText(value.course_name) ||
    !Array.isArray(value.meetings) ||
    !Array.isArray(value.deadlines) ||
    !isStringList(value.questions)
  ) {
    return false;
  }

  const validMeetings = value.meetings.every((meeting: unknown) => {
    if (!isRecord(meeting) || !Array.isArray(meeting.weekdays)) return false;

    return (
      typeof meeting.label === "string" &&
      meeting.weekdays.every(
        (day: unknown) =>
          typeof day === "number" &&
          Number.isInteger(day) &&
          day >= 0 &&
          day <= 6
      ) &&
      [
        "start_time",
        "end_time",
        "start_date",
        "end_date",
        "location",
        "notes",
      ].every((field) => isNullableText(meeting[field])) &&
      [null, 1, 2].some((value) => value === meeting.repeat_every_weeks) &&
      isStringList(meeting.excluded_dates) &&
      isSourcePage(meeting.source_page)
    );
  });

  const validDeadlines = value.deadlines.every((deadline: unknown) => {
    if (!isRecord(deadline)) return false;

    return (
      typeof deadline.title === "string" &&
      typeof deadline.kind === "string" &&
      deadlineKinds.includes(deadline.kind) &&
      isNullableText(deadline.due_date) &&
      isNullableText(deadline.due_time) &&
      isSourcePage(deadline.source_page)
    );
  });

  return validMeetings && validDeadlines;
}