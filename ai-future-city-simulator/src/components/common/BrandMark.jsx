import YugNirmanMark from "../../assets/yug-nirman-mark.svg";

export default function BrandMark({ className = "h-7 w-7" }) {
  return <img className={`block object-contain ${className}`} src={YugNirmanMark} alt="" aria-hidden="true" />;
}
