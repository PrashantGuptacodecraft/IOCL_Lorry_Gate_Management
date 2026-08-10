import { EntryWizard } from "../../../../components/entry/entry-wizard";
import { PageHeader } from "../../../../components/ui/page-header";

export default function NewEntryPage() {
  return (
    <div>
      <PageHeader eyebrow="Guided gate workflow" title="Create New IN Entry" description="Scan the crew pass, verify physical vehicle details and complete the mandatory safety checklist." />
      <EntryWizard />
    </div>
  );
}
