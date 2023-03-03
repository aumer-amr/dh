export interface PlotConfig {
    [key: string]: any;
}

export interface PlotConfigOption {
    name: string;
    description: string;
    type: string;
    default?: any;
    required: boolean;
}

export type PlotConfigOptionType = 'string' | 'number' | 'boolean';