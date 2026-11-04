import { Fragment, type ReactNode } from "react";

import type { ProfileRow, ProfileRowId } from "./profile-format";
import { Divider, Group, ValueRow } from "./you-settings";

type Props = {
  readonly title: string;
  readonly rows: readonly ProfileRow[];
  readonly onEdit: (id: ProfileRowId) => void;
  /** Extra card content after the rows (Training: location + about your days). */
  readonly before?: ReactNode;
  readonly after?: ReactNode;
};

/** S41 Body / Nutrition card: one 52pt chevron row per field, hairline dividers. */
export const RowsSection = ({ title, rows, onEdit, before, after }: Props) => (
  <Group title={title}>
    {before}
    {rows.map((row, i) => (
      <Fragment key={row.id}>
        {i > 0 || before ? <Divider /> : null}
        <ValueRow title={row.title} value={row.value} onPress={() => onEdit(row.id)} />
      </Fragment>
    ))}
    {after}
  </Group>
);
