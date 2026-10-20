import ClipartSection from "./ClipartSection";
import { ClipartCategoryType } from "./types";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowRight,
  faCity,
  faSmile,
  faLeaf,
  faBorderAll,
  faHeart,
  faUser,
  faInfoCircle,
  faGlobe,
  faFont,
  faMusic,
  faFutbol,
  faShapes,
  faSun,
  faCarrot,
} from "@fortawesome/free-solid-svg-icons";

interface Props {
  categories?: ClipartCategoryType[];
  onSelectCategory: (id: string) => void;
}

const icons: Record<string, any> = {
  arrows: faArrowRight,
  banners: faBorderAll,
  city: faCity,
  emojis: faSmile,
  flowers: faLeaf,
  frames: faBorderAll,
  hearts: faHeart,
  humans: faUser,
  information: faInfoCircle,
  internet: faGlobe,
  letters: faFont,
  music: faMusic,
  sport: faFutbol,
  universal: faShapes,
  summer: faSun,
  vegetables: faCarrot,
};

export default function ClipartSectionsPage({
  categories = [],
  onSelectCategory,
}: Props) {
  return (
    <div className="grid grid-cols-2 gap-6">
      {categories.map((category) => (
        <ClipartSection
          key={category.id}
          title={category.name}
          icon={
            <FontAwesomeIcon
              icon={icons[category.id] ?? faBorderAll}
            />
          }
          onClick={() => onSelectCategory(category.id)}
        />
      ))}
    </div>
  );
}
