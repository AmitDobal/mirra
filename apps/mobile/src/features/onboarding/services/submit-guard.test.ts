import assert from "node:assert/strict";
import { test } from "node:test";

import {
  clearQuizWalked,
  decideOnboardingSubmit,
  isQuizWalked,
  markQuizWalked,
} from "./submit-guard.ts";

test("AMI-177: no quiz this session → never PUT onboarding", () => {
  for (const serverOnboarded of [true, false, null]) {
    for (const entitled of [true, false]) {
      assert.equal(decideOnboardingSubmit({ quizWalked: false, serverOnboarded, entitled }), "skip");
    }
  }
});

test("AMI-177: onboarded + paid user is never overwritten by the funnel", () => {
  assert.equal(decideOnboardingSubmit({ quizWalked: true, serverOnboarded: true, entitled: true }), "skip");
});

test("unpaid edit-answers re-run sends reset; first completion submits", () => {
  assert.equal(decideOnboardingSubmit({ quizWalked: true, serverOnboarded: true, entitled: false }), "reset");
  assert.equal(decideOnboardingSubmit({ quizWalked: true, serverOnboarded: false, entitled: false }), "submit");
  assert.equal(decideOnboardingSubmit({ quizWalked: true, serverOnboarded: null, entitled: false }), "submit");
});

test("quiz-walked flag is session scoped and clearable", () => {
  clearQuizWalked();
  assert.equal(isQuizWalked(), false);
  markQuizWalked();
  assert.equal(isQuizWalked(), true);
  clearQuizWalked();
  assert.equal(isQuizWalked(), false);
});
