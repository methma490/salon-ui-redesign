import React, { useMemo, useState } from 'react';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { SRI_LANKAN_CITIES } from '@/lib/constants/cities';
import { cn } from '@/lib/utils';
import { Search } from 'lucide-react';

interface CitySelectProps {
  id?: string;
  value: string;
  onChange: (city: string) => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
}

export const CitySelect: React.FC<CitySelectProps> = ({
  id,
  value,
  onChange,
  className,
  placeholder = 'Select city',
  disabled = false,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isCustomMode, setIsCustomMode] = useState(false);

  const filteredCities = useMemo(() => {
    if (!searchTerm.trim()) {
      return SRI_LANKAN_CITIES;
    }
    const query = searchTerm.toLowerCase();
    return SRI_LANKAN_CITIES.filter((city) =>
      city.toLowerCase().includes(query)
    );
  }, [searchTerm]);

  const isValueInPredefined = useMemo(() => {
    if (!value) return true;
    return SRI_LANKAN_CITIES.includes(value as (typeof SRI_LANKAN_CITIES)[number]);
  }, [value]);

  if (isCustomMode) {
    return (
      <div className="flex items-center gap-1.5">
        <Input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Enter custom city"
          className={cn('h-8 text-sm', className)}
          disabled={disabled}
          autoFocus
        />
        <button
          type="button"
          onClick={() => {
            setIsCustomMode(false);
            if (!isValueInPredefined) {
              onChange(SRI_LANKAN_CITIES[0]);
            }
          }}
          className="shrink-0 text-[11px] font-medium text-primary hover:underline"
        >
          List
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <Select
        value={value}
        onValueChange={(val) => {
          if (val === '__custom__') {
            setIsCustomMode(true);
            onChange('');
          } else {
            onChange(val);
          }
        }}
        disabled={disabled}
      >
        <SelectTrigger id={id} className={cn('h-8 text-sm bg-background', className)}>
          <SelectValue placeholder={placeholder}>
            {value || placeholder}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="max-h-64">
          <div className="sticky top-0 z-10 bg-popover p-1 border-b border-border/50">
            <div className="relative flex items-center">
              <Search className="absolute left-2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                placeholder="Search city..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
                className="h-7 w-full rounded-sm bg-muted/50 pl-7 pr-2 text-xs outline-none placeholder:text-muted-foreground focus:bg-muted"
              />
            </div>
          </div>
          <SelectGroup className="pt-1">
            {filteredCities.map((city) => (
              <SelectItem key={city} value={city} className="text-xs">
                {city}
              </SelectItem>
            ))}
            {filteredCities.length === 0 && (
              <div className="py-2 text-center text-xs text-muted-foreground">
                No cities found
              </div>
            )}
            {!isValueInPredefined && value && (
              <SelectItem value={value} className="text-xs font-semibold">
                {value} (Selected)
              </SelectItem>
            )}
            <SelectItem value="__custom__" className="text-xs text-primary font-medium border-t border-border/40 mt-1">
              + Other / Enter custom city
            </SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
};
