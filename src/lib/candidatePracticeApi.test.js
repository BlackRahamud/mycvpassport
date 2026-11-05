jest.mock("@supabase/supabase-js", () => ({ createClient: jest.fn() }));

const { createClient } = require("@supabase/supabase-js");

const AI_EVALUATION = {
  score: 84,
  criteria: { relevance: 4, structure: 4, specificity: 4, clarity: 4, completeness: 4, accuracy: 4 },
  strengths: ["Clear example"],
  improvements: ["Add a measurable result"],
  missing_evidence: [],
  suggested_answer: "A concise example answer.",
  follow_up_needed: false,
  follow_up_question: null,
  follow_up_reason: null,
  conversational_phrase: "I see.",
};

const AI_FOLLOW_UP_EVALUATION = {
  ...AI_EVALUATION,
  follow_up_needed: true,
  follow_up_question: "What result did you measure?",
  follow_up_reason: "The result was not quantified.",
};

const AI_REPORT = {
  summary: "A focused practice session with useful examples.",
  strongest_areas: ["Clear examples"],
  areas_to_improve: ["Quantify impact"],
  observations: ["Good structure"],
  improvement_plan: [{ topic: "Evidence", action: "Add one metric to each example." }],
};

function makeDb(initialTables = {}, failOperation = null) {
  const clone = (value) => JSON.parse(JSON.stringify(value));
  const tables = {
    practice_sessions: clone(initialTables.practice_sessions || []),
    practice_turns: clone(initialTables.practice_turns || []),
  };
  let nextId = 1;
  const injectedFailure = { ...failOperation };

  class Query {
    constructor(table) {
      this.table = table;
      this.operation = "select";
      this.payload = null;
      this.filters = [];
      this.sort = null;
      this.rowLimit = null;
    }
    select() { return this; }
    insert(payload) { this.operation = "insert"; this.payload = payload; return this; }
    update(payload) { this.operation = "update"; this.payload = payload; return this; }
    eq(field, value) { this.filters.push((row) => String(row[field]) === String(value)); return this; }
    neq(field, value) { this.filters.push((row) => String(row[field]) !== String(value)); return this; }
    is(field, value) { this.filters.push((row) => row[field] === value); return this; }
    lt(field, value) { this.filters.push((row) => row[field] < value); return this; }
    order(field, options = {}) { this.sort = { field, ascending: options.ascending !== false }; return this; }
    limit(value) { this.rowLimit = value; return this; }
    maybeSingle() { return this.execute(true, true); }
    single() { return this.execute(true, false); }
    then(resolve, reject) { return this.execute(false, true).then(resolve, reject); }
    async execute(single, optional) {
      if (injectedFailure?.table === this.table && injectedFailure.operation === this.operation && (!injectedFailure.match || injectedFailure.match(this.payload))) {
        if (!injectedFailure.used) {
          injectedFailure.used = true;
          return { data: null, error: { message: "injected database failure", code: injectedFailure.code || "XX000" } };
        }
      }
      const rows = tables[this.table];
      const matches = () => rows.filter((row) => this.filters.every((filter) => filter(row)));
      if (this.operation === "insert") {
        const input = Array.isArray(this.payload) ? this.payload : [this.payload];
        for (const item of input) {
          if (this.table === "practice_turns" && rows.some((row) => row.session_id === item.session_id && Number(row.position) === Number(item.position))) {
            return { data: null, error: { message: "duplicate key", code: "23505" } };
          }
        }
        const inserted = input.map((item) => ({ id: `new-${nextId++}`, created_at: new Date().toISOString(), ...item }));
        rows.push(...inserted);
        return { data: single ? inserted[0] : inserted, error: null };
      }
      if (this.operation === "update") {
        const updated = matches().map((row) => {
          Object.assign(row, this.payload);
          return { ...row };
        });
        if (single && !updated.length) return { data: null, error: optional ? null : { message: "row missing", code: "PGRST116" } };
        return { data: single ? updated[0] || null : updated, error: null };
      }
      let selected = matches();
      if (this.sort) selected = [...selected].sort((a, b) => (Number(a[this.sort.field]) - Number(b[this.sort.field])) * (this.sort.ascending ? 1 : -1));
      if (this.rowLimit != null) selected = selected.slice(0, this.rowLimit);
      if (single && !selected.length && !optional) return { data: null, error: { message: "row missing", code: "PGRST116" } };
      return { data: single ? selected[0] || null : selected, error: null };
    }
  }

  const admin = { from: (table) => new Query(table) };
  return { tables, admin };
}

function makeSession() {
  return {
    id: "session-1", candidate_id: "candidate-1", role_title: "Analyst", job_description: "",
    cv_text: "Candidate background text", mode: "text", difficulty: "intermediate",
    category: "general", status: "in_progress", report: null, completed_at: null,
  };
}

function makeTurn() {
  return {
    id: "turn-1", session_id: "session-1", candidate_id: "candidate-1", position: 1,
    question_id: "q1", root_question_id: "q1", category: "experience", question: "Describe a project.",
    choices: [], answer: null, evaluation: null, evaluation_started_at: null,
    is_follow_up: false, follow_up_count: 0,
  };
}

function makeNextTurn() {
  return { ...makeTurn(), id: "turn-2", position: 2, question_id: "q2", root_question_id: "q2", question: "What would you do next?" };
}

function makeHistoryTurn() {
  return { ...makeTurn(), id: "turn-0", position: 0, question_id: "q0", root_question_id: "q0", question: "What have you worked on?", answer: "I led an earlier project." };
}

let handler;
let currentDb;
let aiResult = AI_EVALUATION;

function mockAnthropic(result = aiResult) {
  global.fetch.mockResolvedValue({
    ok: true,
    status: 200,
    text: async () => JSON.stringify({ content: [{ type: "text", text: JSON.stringify(result) }] }),
  });
}

async function post(task, extra = {}) {
  const response = {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
    setHeader() {},
  };
  await handler({
    method: "POST",
    headers: { authorization: "Bearer test-token" },
    query: { action: "practice_interview" },
    body: { task, sessionId: "session-1", turnId: "turn-1", answer: "A saved candidate answer.", ...extra },
  }, response);
  return response;
}

beforeAll(() => {
  process.env.SUPABASE_URL = "https://project.test";
  process.env.SUPABASE_ANON_KEY = "anon-test";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-test";
  process.env.ANTHROPIC_API_KEY = "anthropic-test";
  handler = require("../../api/ai").default;
});

beforeEach(() => {
  currentDb = makeDb({ practice_sessions: [makeSession()], practice_turns: [makeTurn()] });
  aiResult = AI_EVALUATION;
  global.fetch = jest.fn();
  mockAnthropic();
  const auth = { auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: "candidate-1" } }, error: null }) } };
  createClient.mockImplementation((_url, key) => key === "service-test" ? currentDb.admin : auth);
});

afterAll(() => { delete global.fetch; });


test("opening task returns the backend-approved interviewer greeting", async () => {
  const response = await post("opening");
  expect(response.statusCode).toBe(200);
  expect(response.body.spokenResponse).toMatch(/^Hello, welcome to your practice interview\./);
});

test("the server never adds a follow-up beyond the 15-turn interview cap", async () => {
  const cappedTurns = Array.from({ length: 15 }, (_, index) => ({
    ...makeTurn(),
    id: `turn-${index + 1}`,
    position: index + 1,
    question_id: `q${index + 1}`,
    root_question_id: `q${index + 1}`,
    question: `Question ${index + 1}?`,
    answer: index === 0 ? null : `Answer ${index + 1}`,
    evaluation: index === 0 ? null : AI_EVALUATION,
  }));
  currentDb = makeDb({ practice_sessions: [makeSession()], practice_turns: cappedTurns });
  aiResult = AI_FOLLOW_UP_EVALUATION;
  mockAnthropic(aiResult);
  const response = await post("evaluate");
  expect(response.statusCode).toBe(200);
  expect(response.body.followUp).toBeNull();
  expect(currentDb.tables.practice_turns).toHaveLength(15);
});

test("answer and evaluation are saved independently and retries do not re-evaluate", async () => {
  currentDb = makeDb({ practice_sessions: [makeSession()], practice_turns: [makeHistoryTurn(), makeTurn(), makeNextTurn()] });
  const first = await post("evaluate");
  expect(first.statusCode).toBe(200);
  expect(currentDb.tables.practice_turns[1].answer).toBe("A saved candidate answer.");
  expect(currentDb.tables.practice_turns[1].evaluation.score).toBe(84);
  expect(first.body.spokenResponse).toBe("I see. What would you do next?");
  expect(first.body.spokenTurnId).toBe("turn-2");
  const prompt = JSON.parse(global.fetch.mock.calls[0][1].body).messages[0].content;
  expect(prompt).toContain("I led an earlier project.");
  expect(prompt).toContain("approved conversational phrase library");
  expect(prompt).toContain("Do not reveal or imply a score");

  const retry = await post("evaluate");
  expect(retry.statusCode).toBe(200);
  expect(retry.body.duplicate).toBe(true);
  expect(retry.body.spokenResponse).toBe(first.body.spokenResponse);
  expect(global.fetch).toHaveBeenCalledTimes(1);
});

test("answer write failures are reported as save failures, not duplicate conflicts", async () => {
  currentDb = makeDb(
    { practice_sessions: [makeSession()], practice_turns: [makeTurn()] },
    { table: "practice_turns", operation: "update", match: (patch) => Boolean(patch.answer) },
  );
  const response = await post("evaluate");
  expect(response.statusCode).toBe(500);
  expect(response.body.error).toMatch(/answer could not be saved/i);
  expect(response.body.error).not.toMatch(/another tab/i);
  expect(currentDb.tables.practice_turns[0].answer).toBeNull();
});

test("evaluation write failure preserves the submitted answer and can be retried", async () => {
  currentDb = makeDb(
    { practice_sessions: [makeSession()], practice_turns: [makeTurn()] },
    { table: "practice_turns", operation: "update", match: (patch) => Boolean(patch.evaluation) },
  );
  const response = await post("evaluate");
  expect(response.statusCode).toBe(500);
  expect(response.body.error).toMatch(/answer is saved/i);
  expect(currentDb.tables.practice_turns[0].answer).toBe("A saved candidate answer.");
  expect(currentDb.tables.practice_turns[0].evaluation).toBeNull();
});

test("follow-up insert failure is recoverable on retry without losing evaluation", async () => {
  aiResult = AI_FOLLOW_UP_EVALUATION;
  mockAnthropic(aiResult);
  currentDb = makeDb(
    { practice_sessions: [makeSession()], practice_turns: [makeTurn()] },
    { table: "practice_turns", operation: "insert", match: (row) => row?.is_follow_up },
  );
  const failed = await post("evaluate");
  expect(failed.statusCode).toBe(500);
  expect(failed.body.error).toMatch(/feedback are saved/i);
  expect(currentDb.tables.practice_turns[0].evaluation.follow_up_needed).toBe(true);

  const retried = await post("evaluate");
  expect(retried.statusCode).toBe(200);
  expect(retried.body.duplicate).toBe(true);
  expect(retried.body.followUp.question).toBe("What result did you measure?");
  expect(retried.body.spokenResponse).toBe("I see. What result did you measure?");
  expect(retried.body.followUp.root_question_id).toBe("q1");
  expect(currentDb.tables.practice_turns.filter((turn) => turn.is_follow_up)).toHaveLength(1);
  expect(global.fetch).toHaveBeenCalledTimes(1);
});

test("rejects unapproved spoken wording without losing the saved answer", async () => {
  aiResult = { ...AI_EVALUATION, conversational_phrase: "Excellent answer, you scored highly." };
  mockAnthropic(aiResult);
  const response = await post("evaluate");
  expect(response.statusCode).toBe(502);
  expect(response.body.error).toMatch(/feedback could not be validated/i);
  expect(currentDb.tables.practice_turns[0].answer).toBe("A saved candidate answer.");
  expect(currentDb.tables.practice_turns[0].evaluation).toBeNull();
  expect(currentDb.tables.practice_turns[0].evaluation_started_at).toBeNull();
});

test("ending a session preserves answers and is safe to retry", async () => {
  currentDb.tables.practice_turns[0].answer = "Already saved.";
  currentDb.tables.practice_turns[0].evaluation = AI_EVALUATION;
  const first = await post("end");
  const retry = await post("end");
  expect(first.body.ended).toBe(true);
  expect(retry.body.ended).toBe(true);
  expect(currentDb.tables.practice_sessions[0].status).toBe("completed");
  expect(currentDb.tables.practice_turns[0].answer).toBe("Already saved.");
  expect(currentDb.tables.practice_turns[0].evaluation.score).toBe(84);
});

test("report failure leaves the session ended and report generation can be retried", async () => {
  await post("end");
  currentDb.tables.practice_turns[0].answer = "A saved candidate answer.";
  currentDb.tables.practice_turns[0].evaluation = AI_EVALUATION;
  global.fetch.mockResolvedValueOnce({ ok: false, status: 503, text: async () => "busy" });
  const failed = await post("report");
  expect(failed.statusCode).toBe(502);
  expect(currentDb.tables.practice_sessions[0].status).toBe("completed");
  expect(currentDb.tables.practice_turns[0].answer).toBe("A saved candidate answer.");

  mockAnthropic(AI_REPORT);
  const retried = await post("report");
  expect(retried.statusCode).toBe(200);
  expect(currentDb.tables.practice_sessions[0].report.summary).toBe(AI_REPORT.summary);

  const duplicate = await post("report");
  expect(duplicate.statusCode).toBe(200);
  expect(duplicate.body.report.summary).toBe(AI_REPORT.summary);
});
