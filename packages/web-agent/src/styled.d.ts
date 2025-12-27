import 'styled-components';
import type { CustomTheme } from './styles/theme';

declare module 'styled-components' {
  export interface DefaultTheme extends CustomTheme {}
}
