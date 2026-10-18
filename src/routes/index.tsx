import { createFileRoute } from "@tanstack/react-router";
import { BirthdayPage } from "@/components/birthday-page";

export const Route = createFileRoute("/")({ component: BirthdayPage });
