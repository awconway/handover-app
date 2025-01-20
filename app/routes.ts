import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
    index("routes/home.tsx"),
    route("audio/:id", "routes/audio.tsx", [
        route("transcription", "routes/transcription.tsx", [
            route(":llm/llm", "routes/llm.tsx"),
        ]),
    ]),
    route("user/:id/audio", "api/upload-audio.tsx"),
] satisfies RouteConfig;
