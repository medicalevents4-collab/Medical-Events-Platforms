import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./reference-layout.css";

class RootErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{minHeight:"100vh",display:"grid",placeItems:"center",padding:24,fontFamily:"system-ui",background:"#f7f5ef",color:"#1f2a1b"}}>
          <div style={{maxWidth:760,width:"100%",background:"#fff",border:"1px solid #ddd8ca",borderRadius:12,padding:24,boxShadow:"0 8px 30px rgba(0,0,0,.08)"}}>
            <h1 style={{marginTop:0}}>Medical Events could not start</h1>
            <p>The browser encountered a startup error. This diagnostic is shown instead of a blank screen.</p>
            <pre style={{whiteSpace:"pre-wrap",background:"#f4f4f4",padding:12,borderRadius:8,overflow:"auto"}}>{this.state.error.message}</pre>
            <p>Please send this message if you need support.</p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById("root")!).render(
  <RootErrorBoundary>
    <App />
  </RootErrorBoundary>
);
