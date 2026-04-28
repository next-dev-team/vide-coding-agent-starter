import { mount } from "svelte";
import "$lib/theme.css";
import Docs from "./Docs.svelte";

const target = document.getElementById("app");
if (!target) throw new Error("Mount target #app not found");

mount(Docs, { target });
