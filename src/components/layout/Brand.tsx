import Icon from "@/components/planner/Icon";

export default function Brand() {
  return (
    <span className="tos-brand">
      <span className="tos-brand-mark"><Icon name="sunrise" className="size-6" /></span>
      <span>Tomorrow<span className="tos-brand-os">OS</span><small>YOUR PLANNER</small></span>
    </span>
  );
}
