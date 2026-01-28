import {
  App,
  applyDocumentTheme,
  applyHostFonts,
  applyHostStyleVariables,
  type McpUiHostContext,
} from "@modelcontextprotocol/ext-apps";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import "./global.css";
import "./mcp-app.css";

interface Option {
  label: string;
  description?: string;
}

interface Question {
  question: string;
  header: string;
  options: Option[];
  multiSelect: boolean;
}

interface QuestionsInput {
  questions: Question[];
}

type Selections = Map<number, Set<string>>;
type OtherInputs = Map<number, string>;

const mainEl = document.querySelector(".main") as HTMLElement;
const questionsContainer = document.getElementById("questions-container")!;
const submitBtn = document.getElementById("submit-btn") as HTMLButtonElement;

let questions: Question[] = [];
let selections: Selections = new Map();
let otherInputs: OtherInputs = new Map();
let isSubmitted = false;

function renderQuestions(qs: Question[]) {
  questions = qs;
  selections.clear();
  otherInputs.clear();
  isSubmitted = false;
  submitBtn.disabled = true;
  submitBtn.classList.remove("submitted");
  submitBtn.textContent = "Submit";

  questionsContainer.innerHTML = "";

  qs.forEach((q, qIndex) => {
    const block = document.createElement("div");
    block.className = "question-block";

    const header = document.createElement("div");
    header.className = "question-header";

    const tag = document.createElement("span");
    tag.className = "question-tag";
    tag.textContent = q.header;

    const questionText = document.createElement("p");
    questionText.className = "question-text";
    questionText.textContent = q.question;

    header.appendChild(tag);
    block.appendChild(header);
    block.appendChild(questionText);

    const optionsList = document.createElement("div");
    optionsList.className = "options-list";

    const allOptions = [...q.options, { label: "Other", description: "Provide custom input" }];
    const inputType = q.multiSelect ? "checkbox" : "radio";
    const inputName = `question-${qIndex}`;

    allOptions.forEach((opt, optIndex) => {
      const isOther = optIndex === allOptions.length - 1;
      const optionId = `q${qIndex}-opt${optIndex}`;
      const optionValue = isOther ? "__other__" : opt.label;

      const optionItem = document.createElement("label");
      optionItem.className = "option-item";
      optionItem.setAttribute("for", optionId);

      const input = document.createElement("input");
      input.type = inputType;
      input.name = inputName;
      input.id = optionId;
      input.value = optionValue;

      input.addEventListener("change", () => {
        handleSelectionChange(qIndex, optionValue, input.checked, q.multiSelect);
        updateOptionStyles(qIndex);
        updateSubmitButton();
      });

      const content = document.createElement("div");
      content.className = "option-content";

      const labelEl = document.createElement("div");
      labelEl.className = "option-label";
      labelEl.textContent = opt.label;
      content.appendChild(labelEl);

      if (opt.description) {
        const descEl = document.createElement("div");
        descEl.className = "option-description";
        descEl.textContent = opt.description;
        content.appendChild(descEl);
      }

      optionItem.appendChild(input);
      optionItem.appendChild(content);
      optionsList.appendChild(optionItem);

      if (isOther) {
        const otherContainer = document.createElement("div");
        otherContainer.className = "other-input-container";
        otherContainer.style.display = "none";

        const otherInput = document.createElement("input");
        otherInput.type = "text";
        otherInput.className = "other-input";
        otherInput.placeholder = "Enter your answer...";
        otherInput.id = `q${qIndex}-other-input`;

        otherInput.addEventListener("input", () => {
          otherInputs.set(qIndex, otherInput.value);
          updateSubmitButton();
        });

        otherContainer.appendChild(otherInput);
        optionsList.appendChild(otherContainer);
      }
    });

    block.appendChild(optionsList);
    questionsContainer.appendChild(block);
  });
}

function handleSelectionChange(
  qIndex: number,
  value: string,
  checked: boolean,
  multiSelect: boolean,
) {
  if (!selections.has(qIndex)) {
    selections.set(qIndex, new Set());
  }

  const sel = selections.get(qIndex)!;

  if (multiSelect) {
    if (checked) {
      sel.add(value);
    } else {
      sel.delete(value);
    }
  } else {
    sel.clear();
    if (checked) {
      sel.add(value);
    }
  }

  const otherContainer = document.querySelector(`#q${qIndex}-other-input`)?.parentElement;
  if (otherContainer) {
    const showOther = sel.has("__other__");
    (otherContainer as HTMLElement).style.display = showOther ? "block" : "none";
    if (!showOther) {
      otherInputs.delete(qIndex);
    }
  }
}

function updateOptionStyles(qIndex: number) {
  const sel = selections.get(qIndex) || new Set();
  const block = questionsContainer.children[qIndex];
  const items = block.querySelectorAll(".option-item");

  items.forEach((item) => {
    const input = item.querySelector("input") as HTMLInputElement;
    if (sel.has(input.value)) {
      item.classList.add("selected");
    } else {
      item.classList.remove("selected");
    }
  });
}

function updateSubmitButton() {
  if (isSubmitted) return;

  const allAnswered = questions.every((_, qIndex) => {
    const sel = selections.get(qIndex);
    if (!sel || sel.size === 0) return false;

    if (sel.has("__other__")) {
      const otherText = otherInputs.get(qIndex);
      return otherText && otherText.trim().length > 0;
    }

    return true;
  });

  submitBtn.disabled = !allAnswered;
}

function buildAnswerText(): string {
  const lines: string[] = [];

  questions.forEach((q, qIndex) => {
    const sel = selections.get(qIndex);
    if (!sel) return;

    const answers: string[] = [];
    sel.forEach((value) => {
      if (value === "__other__") {
        const otherText = otherInputs.get(qIndex);
        if (otherText) {
          answers.push(`Other: ${otherText.trim()}`);
        }
      } else {
        answers.push(value);
      }
    });

    lines.push(`${q.header}: ${answers.join(", ")}`);
  });

  return lines.join("\n");
}

async function handleSubmit() {
  if (isSubmitted || submitBtn.disabled) return;

  const answerText = buildAnswerText();

  try {
    const { isError } = await app.sendMessage({
      role: "user",
      content: [{ type: "text", text: answerText }],
    });

    if (isError) {
      console.warn("Message was rejected by host");
    } else {
      isSubmitted = true;
      submitBtn.textContent = "Submitted";
      submitBtn.classList.add("submitted");
      submitBtn.disabled = true;

      document.querySelectorAll("input").forEach((input) => {
        input.disabled = true;
      });
    }
  } catch (e) {
    console.error("Failed to send message:", e);
  }
}

function extractQuestions(result: CallToolResult): Question[] {
  const sc = result.structuredContent as QuestionsInput | undefined;
  return sc?.questions ?? [];
}

function handleHostContextChanged(ctx: McpUiHostContext) {
  if (ctx.theme) {
    applyDocumentTheme(ctx.theme);
  }
  if (ctx.styles?.variables) {
    applyHostStyleVariables(ctx.styles.variables);
  }
  if (ctx.styles?.css?.fonts) {
    applyHostFonts(ctx.styles.css.fonts);
  }
  if (ctx.safeAreaInsets) {
    mainEl.style.paddingTop = `${ctx.safeAreaInsets.top}px`;
    mainEl.style.paddingRight = `${ctx.safeAreaInsets.right}px`;
    mainEl.style.paddingBottom = `${ctx.safeAreaInsets.bottom}px`;
    mainEl.style.paddingLeft = `${ctx.safeAreaInsets.left}px`;
  }
}

const app = new App({ name: "Ask User", version: "1.0.0" });

app.onteardown = async () => {
  return {};
};

app.ontoolinput = (params) => {
  const args = params.arguments as QuestionsInput | undefined;
  if (args?.questions) {
    renderQuestions(args.questions);
  }
};

app.ontoolresult = (result) => {
  const qs = extractQuestions(result);
  if (qs.length > 0) {
    renderQuestions(qs);
  }
};

app.onerror = console.error;

app.onhostcontextchanged = handleHostContextChanged;

submitBtn.addEventListener("click", handleSubmit);

app.connect().then(() => {
  const ctx = app.getHostContext();
  if (ctx) {
    handleHostContextChanged(ctx);
  }
});
