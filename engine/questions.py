"""How the engine gets a missing fact: from the user (console), from a scripted answers file, or not at all."""

UNKNOWN_WORDS = {"?", "unknown", "dont know", "don't know", "no se", "no sé", "ns"}
YES = {"y", "yes", "true", "1", "s", "si", "sí"}
NO = {"n", "no", "false", "0"}


class Unknown:
    """The user does not know the answer. Rules that need this fact stay undecided."""

    def __repr__(self):
        return "unknown"


UNKNOWN_ANSWER = Unknown()


def parse_answer(question, raw):
    """Convert raw text to the question's type. Raises ValueError when the answer is invalid."""
    text = str(raw).strip().lower()
    if text in UNKNOWN_WORDS:
        return UNKNOWN_ANSWER
    kind = question["type"]
    if kind == "boolean":
        if text in YES:
            return True
        if text in NO:
            return False
        raise ValueError("answer yes or no (or ? if you don't know)")
    if kind == "number":
        value = float(text.replace(",", "."))
        if ("min" in question and value < question["min"]) or ("max" in question and value > question["max"]):
            raise ValueError(f"enter a number between {question.get('min')} and {question.get('max')}")
        return int(value) if value.is_integer() else value
    if kind == "choice":
        options = {o.lower(): o for o in question["options"]}
        if text in options:
            return options[text]
        if text.isdigit() and 1 <= int(text) <= len(question["options"]):
            return question["options"][int(text) - 1]
        raise ValueError(f"choose one of {question['options']}")
    raise ValueError(f"unknown question type {kind}")


class ConsoleAsker:
    def __init__(self, input_fn=input, print_fn=print):
        self.input, self.print = input_fn, print_fn

    def ask(self, question):
        hint = {"boolean": "yes/no", "number": "number"}.get(question["type"])
        if question["type"] == "choice":
            hint = " / ".join(f"{i}) {o}" for i, o in enumerate(question["options"], 1))
        while True:
            raw = self.input(f"\n? {question['text']}  [{hint}, ? = don't know]\n> ")
            try:
                return parse_answer(question, raw)
            except ValueError as err:
                self.print(f"  Invalid answer: {err}")


class ScriptedAsker:
    """Answers from a dict (an answers JSON file). A question with no scripted answer is answered 'unknown'."""

    def __init__(self, answers):
        self.answers = answers

    def ask(self, question):
        if question["fact"] not in self.answers:
            return UNKNOWN_ANSWER
        value = self.answers[question["fact"]]
        return value if not isinstance(value, str) or question["type"] == "choice" else parse_answer(question, value)


class NoAsker:
    def ask(self, question):
        return UNKNOWN_ANSWER
