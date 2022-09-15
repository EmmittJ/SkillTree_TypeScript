interface IAscendancyClassesV7 extends Omit<IAscendancyClassesV1, 'classes'> {
    ascendancies: Array<IAscendancyClassV7>;
    base_dex: number;
    base_int: number;
    base_str: number;
}