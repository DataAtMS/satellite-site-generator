import { useState } from "react";
import { Route, Switch } from "wouter";
import type { GeneratorState, SiteConfig, WrittenArticle, LogLine } from "./lib/types";
import Header from "./components/Header";
import StepIndicator from "./components/StepIndicator";
import Step1Config from "./pages/Step1Config";
import Step2Topics from "./pages/Step2Topics";
import Step3Editor from "./pages/Step3Editor";
import Step4Generate from "./pages/Step4Generate";
import MySites from "./pages/MySites";
import SiteEditor from "./pages/SiteEditor";

const initialState: GeneratorState = {
  step: 1,
  siteConfig: null,
  topicIdeas: [],
  writtenArticles: [],
  writingLog: [],
  isWriting: false,
  isGenerating: false,
  generationLog: [],
  downloadUrl: null,
};

function Generator() {
  const [state, setState] = useState<GeneratorState>(initialState);

  const updateState = (updates: Partial<GeneratorState>) => {
    setState((prev) => ({ ...prev, ...updates }));
  };

  const goToStep = (step: GeneratorState["step"]) => {
    setState((prev) => ({ ...prev, step }));
  };

  const handleConfigSubmit = (config: SiteConfig) => {
    updateState({ siteConfig: config, step: 2 });
  };

  const handleWritingComplete = (articles: WrittenArticle[], log: LogLine[]) => {
    updateState({ writtenArticles: articles, writingLog: log, isWriting: false, step: 3 });
  };

  const handleEditorSubmit = (articles: WrittenArticle[]) => {
    updateState({ writtenArticles: articles, step: 4 });
  };

  const addGenerationLogLine = (line: LogLine) => {
    setState((prev) => ({
      ...prev,
      generationLog: [...prev.generationLog, line],
    }));
  };

  const setDownloadUrl = (url: string) => {
    updateState({ downloadUrl: url, isGenerating: false });
  };

  const resetGenerator = () => {
    setState(initialState);
  };

  return (
    <main style={{ flex: 1, padding: "40px 0 80px" }}>
      <div className="container">
        <StepIndicator currentStep={state.step} />

        {state.step === 1 && (
          <Step1Config
            initialConfig={state.siteConfig}
            onSubmit={handleConfigSubmit}
          />
        )}

        {state.step === 2 && state.siteConfig && (
          <Step2Topics
            siteConfig={state.siteConfig}
            existingTopics={state.topicIdeas}
            existingArticles={state.writtenArticles}
            existingLog={state.writingLog}
            isWriting={state.isWriting}
            onTopicsChange={(topics) => updateState({ topicIdeas: topics })}
            onWritingStart={() => updateState({ isWriting: true, writingLog: [], writtenArticles: [] })}
            onWritingComplete={handleWritingComplete}
            onBack={() => goToStep(1)}
          />
        )}

        {state.step === 3 && state.siteConfig && (
          <Step3Editor
            siteConfig={state.siteConfig}
            articles={state.writtenArticles}
            onSubmit={handleEditorSubmit}
            onBack={() => goToStep(2)}
          />
        )}

        {state.step === 4 && state.siteConfig && (
          <Step4Generate
            siteConfig={state.siteConfig}
            articles={state.writtenArticles}
            log={state.generationLog}
            downloadUrl={state.downloadUrl}
            isGenerating={state.isGenerating}
            onStart={() => updateState({ isGenerating: true, generationLog: [], downloadUrl: null })}
            onLogLine={addGenerationLogLine}
            onComplete={setDownloadUrl}
            onReset={resetGenerator}
            onBack={() => goToStep(3)}
          />
        )}
      </div>
    </main>
  );
}

export default function App() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column" }}>
      <Header />
      <Switch>
        <Route path="/sites/:id" component={SiteEditor} />
        <Route path="/sites" component={() => (
          <main style={{ flex: 1, padding: "40px 0 80px" }}>
            <div className="container">
              <MySites />
            </div>
          </main>
        )} />
        <Route path="/" component={Generator} />
      </Switch>
    </div>
  );
}
