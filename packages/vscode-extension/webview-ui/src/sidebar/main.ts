import { mount } from "svelte";
import "$lib/theme.css";
import Sidebar from "./Sidebar.svelte";

const target = document.getElementById("app");
if (!target) throw new Error("Mount target #app not found");

mount(Sidebar, { target });
